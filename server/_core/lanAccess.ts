import type { Request } from "express";
import { isIP } from "node:net";
import { hostname } from "node:os";

export function isLanAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 127 || a === 10 ||
      (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 169 && b === 254);
  }
  return isIP(normalized) === 6 &&
    (normalized === "::1" || /^(fc|fd)/.test(normalized) || /^fe[89ab]/.test(normalized));
}

/** Use the TCP peer, never forwarded headers, for anonymous LAN scanner access. */
export function isLanScannerRequest(req: Pick<Request, "headers" | "socket">): boolean {
  if (process.env.LAN_PUBLIC_SCANNER !== "true") return false;
  if (!isLanAddress(req.socket?.remoteAddress ?? "")) return false;
  try {
    const host = new URL(`http://${req.headers.host ?? ""}`).hostname
      .toLowerCase().replace(/^\[|\]$/g, "");
    return isLanAddress(host) || host === "localhost" || host === hostname().toLowerCase();
  } catch {
    return false;
  }
}
