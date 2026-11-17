#!/usr/bin/env node
// Verifies that documented, declared and used VITE_* variables stay in sync.
// Runs with plain Node — no project dependencies required.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = resolve(HERE, "..");

export const DOC_FILES = [".env.example", "README.md", "docs/ports.md"];
export const DECLARATION_FILE = "src/vite-env.d.ts";
export const DUPLICATE_DECLARATION_FILE = "vite-env.d.ts";

const ANY_VITE = /VITE_[A-Z0-9_]+/g;
const VITE_READ = /(?:import\.meta\.env|process\.env)\.(VITE_[A-Z0-9_]+)/g;
const SECRET_SEGMENTS = new Set([
  "KEY",
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASSWD",
  "CREDENTIAL",
  "CREDENTIALS",
]);

function isSecretName(name) {
  return name.split("_").some((part) => SECRET_SEGMENTS.has(part));
}

function walk(root, dir) {
  const found = [];
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return found;
  const stack = [absolute];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
        stack.push(full);
      } else if (entry.isFile()) {
        found.push(relative(root, full).split("\\").join("/"));
      }
    }
  }
  return found.sort();
}

export function listCodeFiles(root = DEFAULT_ROOT) {
  const files = walk(root, "src").filter(
    (file) =>
      /\.(ts|tsx)$/.test(file) &&
      file !== DECLARATION_FILE &&
      !file.startsWith("src/test/")
  );
  if (existsSync(join(root, "vite.config.ts"))) files.push("vite.config.ts");
  return files.sort();
}

function collect(files, root, regex) {
  const found = new Set();
  for (const file of files) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const match of text.matchAll(regex)) found.add(match[1] || match[0]);
  }
  return found;
}

export function checkEnvVars(root = DEFAULT_ROOT) {
  const documented = collect(DOC_FILES, root, ANY_VITE);
  const declared = collect([DECLARATION_FILE], root, ANY_VITE);
  const codeFiles = listCodeFiles(root);
  const used = collect(codeFiles, root, VITE_READ);

  const docMarkdown = walk(root, "docs").filter((file) => file.endsWith(".md"));
  const secretSources = [
    ...new Set([...DOC_FILES, ...docMarkdown, DECLARATION_FILE, ...codeFiles]),
  ];
  const secretNames = new Set();
  for (const file of secretSources) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const match of readFileSync(path, "utf8").matchAll(ANY_VITE)) {
      if (isSecretName(match[0])) secretNames.add(match[0]);
    }
  }

  const sorted = (set) => [...set].sort();
  const problems = [];
  for (const name of sorted(documented)) {
    if (!used.has(name)) problems.push(`documented but never read in code: ${name}`);
  }
  for (const name of sorted(used)) {
    if (!documented.has(name)) problems.push(`read in code but not documented: ${name}`);
  }
  for (const name of sorted(declared)) {
    if (!documented.has(name)) problems.push(`declared in types but not documented: ${name}`);
  }
  for (const name of sorted(documented)) {
    if (!declared.has(name)) problems.push(`documented but not declared in types: ${name}`);
  }
  for (const name of sorted(secretNames)) {
    problems.push(`secret-bearing VITE_ variable is not allowed: ${name}`);
  }
  if (existsSync(join(root, DUPLICATE_DECLARATION_FILE))) {
    problems.push(
      `duplicate declaration file must be removed: ${DUPLICATE_DECLARATION_FILE} (keep src/vite-env.d.ts)`
    );
  }

  return {
    documented: sorted(documented),
    declared: sorted(declared),
    used: sorted(used),
    problems,
  };
}

export function formatReport(result) {
  const lines = [
    `Documented: ${result.documented.join(", ") || "(none)"}`,
    `Declared:   ${result.declared.join(", ") || "(none)"}`,
    `Used:       ${result.used.join(", ") || "(none)"}`,
  ];
  if (result.problems.length === 0) {
    lines.push("Env var configuration check passed.");
  } else {
    lines.push(`Env var configuration check failed (${result.problems.length} problem(s)):`);
    for (const problem of result.problems) lines.push(`  - ${problem}`);
  }
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const rootArg = args.find((arg) => arg !== "--json");
  const root = rootArg ? resolve(rootArg) : DEFAULT_ROOT;
  const result = checkEnvVars(root);

  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  process.stdout.write(`${formatReport(result)}\n`);
  if (result.problems.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
