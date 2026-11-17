import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Tests execute from the repository root; resolve paths relative to this file
// so they also work when invoked from another directory.
const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (file: string): string =>
  readFileSync(path.join(root, file), "utf8");

describe("Docker and CI hardening", () => {
  it("keeps secrets and build artifacts out of the Docker context", () => {
    const dockerignore = read(".dockerignore");
    for (const entry of [".git", ".env*", "node_modules", "dist", "docs"]) {
      expect(dockerignore, `missing .dockerignore entry: ${entry}`).toContain(
        entry
      );
    }
  });

  it("pins both base images by digest", () => {
    const dockerfile = read("Dockerfile");
    expect(dockerfile).toMatch(
      /FROM oven\/bun:alpine@sha256:[0-9a-f]{64}\s+AS build/
    );
    expect(dockerfile).toMatch(/FROM nginx:alpine@sha256:[0-9a-f]{64}/);
  });

  it("ships hardening headers with a valid, restrictive CSP", () => {
    const headers = read("nginx/security-headers.conf");
    const cspLine = headers
      .split("\n")
      .find((line) => line.includes("Content-Security-Policy"));
    expect(cspLine).toBeDefined();

    const csp = cspLine!.match(/"([^"]+)"/)?.[1] ?? "";
    const directives = new Map(
      csp
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [name, ...values] = part.split(/\s+/);
          return [name, values] as const;
        })
    );

    for (const name of [
      "default-src",
      "script-src",
      "style-src",
      "img-src",
      "font-src",
      "connect-src",
      "worker-src",
      "frame-ancestors",
      "base-uri",
      "form-action",
      "object-src",
    ]) {
      expect(directives.has(name), `CSP is missing ${name}`).toBe(true);
    }
    expect(directives.get("default-src")).toContain("'self'");
    expect(directives.get("frame-ancestors")).toContain("'none'");
    expect(directives.get("object-src")).toContain("'none'");

    for (const header of [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Strict-Transport-Security",
    ]) {
      expect(headers, `missing header: ${header}`).toContain(header);
    }

    // The /assets location sets its own add_header, so nginx drops inherited
    // headers there — the shared headers must be re-included explicitly.
    const nginxConf = read("nginx/default.conf");
    expect(nginxConf).toContain("include /etc/nginx/security-headers.conf;");
    const assetsBlock =
      nginxConf.match(/location \/assets\s*\{[\s\S]*?\}/)?.[0] ?? "";
    expect(assetsBlock).toContain("add_header Cache-Control");
    expect(assetsBlock).toContain("include /etc/nginx/security-headers.conf;");
  });

  it("pins CI actions by SHA and audits dependencies", () => {
    const ci = read(".github/workflows/lozana-ci.yml");
    expect(ci).not.toMatch(/uses: actions\/checkout@v/);
    expect(ci).not.toMatch(/uses: oven-sh\/setup-bun@v/);
    expect(ci).toMatch(/uses: actions\/checkout@[0-9a-f]{40}/);
    expect(ci).toMatch(/uses: oven-sh\/setup-bun@[0-9a-f]{40}/);
    expect(ci).toMatch(/bun audit/);
  });

  it("fails CI when no tests are discovered", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.test).not.toContain("--passWithNoTests");
    expect(pkg.scripts.test).toContain("vitest");
  });
});
