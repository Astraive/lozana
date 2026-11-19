/**
 * Endpoint URL policy for dashboard -> collector / Cortex traffic.
 *
 * Configured URLs can be written to localStorage by any script running on the
 * page, and the browser's WebSocket API cannot send an Authorization header.
 * Therefore every URL is validated before use: only expected schemes are
 * accepted, plaintext is limited to loopback hosts, and non-loopback origins
 * must be explicitly allowed (same-origin or VITE_LOZANA_ALLOWED_ORIGINS).
 */

export type EndpointPurpose = "http" | "websocket";

export class EndpointValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointValidationError";
  }
}

const SECURE_PROTOCOLS = new Set(["https:", "wss:"]);
const PURPOSE_PROTOCOLS: Record<EndpointPurpose, readonly string[]> = {
  http: ["http:", "https:"],
  // http/https are accepted because buildTailWebSocketUrl upgrades them.
  websocket: ["http:", "https:", "ws:", "wss:"],
};

const LOOPBACK_IPV4 = /^127(?:\.\d{1,3}){3}$/;

export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (LOOPBACK_IPV4.test(host)) return true;
  if (host === "::1" || host === "0:0:0:0:0:0:0:1" || host === "::ffff:127.0.0.1") {
    return true;
  }
  return false;
}

/** Host + effective port, with the scheme removed so http/ws pairs match. */
export function endpointOriginKey(url: URL): string {
  const port = url.port || (url.protocol === "https:" || url.protocol === "wss:" ? "443" : "80");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return `${host}:${port}`;
}

function allowedOriginKeys(): Set<string> {
  const keys = new Set<string>();
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  const configured =
    nodeEnv?.VITE_LOZANA_ALLOWED_ORIGINS ?? import.meta.env?.VITE_LOZANA_ALLOWED_ORIGINS;
  for (const entry of String(configured ?? "").split(/[\s,]+/)) {
    if (!entry) continue;
    try {
      keys.add(endpointOriginKey(new URL(entry)));
    } catch {
      // Ignore malformed entries in the explicit allowlist.
    }
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    try {
      keys.add(endpointOriginKey(new URL(window.location.origin)));
    } catch {
      // Ignore an unavailable location.
    }
  }
  return keys;
}

export interface ValidateEndpointOptions {
  purpose?: EndpointPurpose;
  /** Reject plaintext URLs on non-loopback hosts (e.g. when a key is set). */
  requireTls?: boolean;
}

export function validateEndpointUrl(
  rawUrl: string,
  options: ValidateEndpointOptions = {}
): URL {
  const purpose = options.purpose ?? "http";
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new EndpointValidationError("Endpoint URL is required");
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new EndpointValidationError("Endpoint URL is not a valid URL");
  }

  const allowedProtocols = PURPOSE_PROTOCOLS[purpose];
  if (!allowedProtocols.includes(url.protocol)) {
    throw new EndpointValidationError(
      `Endpoint URL must use ${allowedProtocols.join(" or ")}; received ${url.protocol}`
    );
  }
  if (url.username || url.password) {
    throw new EndpointValidationError("Endpoint URL must not contain credentials");
  }

  const loopback = isLoopbackHost(url.hostname);
  if (options.requireTls && !SECURE_PROTOCOLS.has(url.protocol) && !loopback) {
    throw new EndpointValidationError(
      `Plaintext endpoints are only allowed on localhost; use https:// or wss:// for ${url.host}`
    );
  }
  if (!loopback && !allowedOriginKeys().has(endpointOriginKey(url))) {
    throw new EndpointValidationError(
      `Endpoint origin ${endpointOriginKey(url)} is not in the allowed origin list`
    );
  }

  return url;
}
