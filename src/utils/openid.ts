import { URL, URLSearchParams } from 'node:url';

export const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
export const OPENID_NS = 'http://specs.openid.net/auth/2.0';
export const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';

export function buildAuthRedirectURL(realm: string, returnTo: string): string {
  const u = new URL(STEAM_OPENID_ENDPOINT);
  const p = new URLSearchParams();
  p.set('openid.ns', OPENID_NS);
  p.set('openid.mode', 'checkid_setup');
  p.set('openid.claimed_id', IDENTIFIER_SELECT);
  p.set('openid.identity', IDENTIFIER_SELECT);
  p.set('openid.return_to', returnTo);
  p.set('openid.realm', realm);
  u.search = p.toString();
  return u.toString();
}

export function parseKeyValueResponse(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

export async function postCheckAuthentication(params: URLSearchParams, timeoutMs = 10000): Promise<Record<string, string>> {
  // Switch to check_authentication
  const cloned = new URLSearchParams(params);
  cloned.set('openid.mode', 'check_authentication');

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: cloned.toString(),
      signal: controller.signal,
    });
    const txt = await resp.text();
    return parseKeyValueResponse(txt);
  } finally {
    clearTimeout(id);
  }
}
