import { URL } from 'node:url';

export function urlsEqual(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return (
      ua.protocol === ub.protocol &&
      ua.host === ub.host &&
      ua.pathname === ub.pathname &&
      ua.search === ub.search
    );
  } catch {
    return false;
  }
}

export function returnToMatches(current: string, returnTo: string): boolean {
  try {
    const cu = new URL(current);
    const ru = new URL(returnTo);
    if (cu.protocol !== ru.protocol || cu.host !== ru.host || cu.pathname !== ru.pathname) {
      return false;
    }
    // All params in return_to must be present with identical values in current
    for (const [k, v] of ru.searchParams) {
      if (cu.searchParams.get(k) !== v) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function withinRealm(realm: string, target: string): boolean {
  try {
    const r = new URL(realm);
    const t = new URL(target);
    return r.protocol === t.protocol && r.host === t.host && t.pathname.startsWith(r.pathname);
  } catch {
    return false;
  }
}

export function isAllowedHost(urlStr: string, allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) return true; // if not provided, accept
  try {
    const u = new URL(urlStr);
    return allowed.some((h) => u.host === h);
  } catch {
    return false;
  }
}

export function parseSteamClaimedId(claimedId: string): string | null {
  try {
    const u = new URL(claimedId);
    if (u.host !== 'steamcommunity.com') return null;
  const m = u.pathname.match(/^\/openid\/id\/(\d{17})$/);
  return m && m[1] ? m[1] : null;
  } catch {
    return null;
  }
}

export function isFreshNonce(responseNonce: string, skewMs = 5 * 60 * 1000): boolean {
  // Spec suggests timestamp at start, e.g., 2025-08-24T12:34:56Z<random>
  const m = responseNonce.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/);
  if (!m) return false;
  const ts = Date.parse(m[1]!);
  if (Number.isNaN(ts)) return false;
  const now = Date.now();
  return Math.abs(now - ts) <= skewMs;
}
