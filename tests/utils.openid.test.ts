import { describe, it, expect } from 'vitest';
import { buildAuthRedirectURL, OPENID_NS, IDENTIFIER_SELECT } from '../src/utils/openid.js';

describe('openid utils', () => {
  it('buildAuthRedirectURL contains required params', () => {
    const url = buildAuthRedirectURL('https://example.com/', 'https://example.com/return?state=abc');
    const u = new URL(url);
    const p = u.searchParams;
    expect(u.origin + u.pathname).toBe('https://steamcommunity.com/openid/login');
    expect(p.get('openid.ns')).toBe(OPENID_NS);
    expect(p.get('openid.mode')).toBe('checkid_setup');
    expect(p.get('openid.claimed_id')).toBe(IDENTIFIER_SELECT);
    expect(p.get('openid.identity')).toBe(IDENTIFIER_SELECT);
    expect(p.get('openid.realm')).toBe('https://example.com/');
    expect(p.get('openid.return_to')).toBe('https://example.com/return?state=abc');
  });
});
