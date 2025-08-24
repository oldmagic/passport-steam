import { describe, it, expect, vi } from 'vitest';
import { parseSteamClaimedId, urlsEqual, withinRealm, isFreshNonce, isAllowedHost, returnToMatches } from '../src/utils/validation.js';

describe('validation utils', () => {
  it('parseSteamClaimedId extracts 17-digit id', () => {
    const id = parseSteamClaimedId('https://steamcommunity.com/openid/id/76561198000000000');
    expect(id).toBe('76561198000000000');
  });

  it('parseSteamClaimedId returns null for wrong host', () => {
    expect(parseSteamClaimedId('https://example.com/openid/id/76561198000000000')).toBeNull();
  });

  it('urlsEqual checks full path and query', () => {
    expect(urlsEqual('https://a.b/c?x=1', 'https://a.b/c?x=1')).toBe(true);
    expect(urlsEqual('https://a.b/c?x=1', 'https://a.b/c?x=2')).toBe(false);
  });

  it('urlsEqual returns false on invalid URL input', () => {
    expect(urlsEqual('not-a-url', 'https://a.b/c')).toBe(false);
    expect(urlsEqual('https://a.b/c', 'also not a url')).toBe(false);
  });

  it('withinRealm validates origin and path prefix', () => {
    expect(withinRealm('https://a.b/', 'https://a.b/cb')).toBe(true);
    expect(withinRealm('https://a.b/app', 'https://a.b/app/return')).toBe(true);
    expect(withinRealm('https://a.b/app', 'https://a.b/other')).toBe(false);
  expect(withinRealm('bad', 'https://a.b/app')).toBe(false);
  });

  it('isAllowedHost allows when list omitted or matches', () => {
    expect(isAllowedHost('https://a.b/x', undefined)).toBe(true);
    expect(isAllowedHost('https://a.b/x', ['a.b'])).toBe(true);
    expect(isAllowedHost('https://a.b/x', ['c.d'])).toBe(false);
  expect(isAllowedHost('not-a-url', ['a.b'])).toBe(false);
  });

  it('isFreshNonce true for current timestamp prefix and false for stale', () => {
    const nowIso = new Date().toISOString().replace(/\..*/, 'Z');
    expect(isFreshNonce(`${nowIso}x123`)).toBe(true);
    const old = new Date(0).toISOString().replace(/\..*/, 'Z');
    expect(isFreshNonce(`${old}abc`)).toBe(false);
  });

  it('returnToMatches handles empty query subset', () => {
    expect(returnToMatches('https://a.b/c', 'https://a.b/c')).toBe(true);
  });

  it('returnToMatches returns false on invalid URLs', () => {
    expect(returnToMatches('not-a-url', 'https://a.b/c?x=1')).toBe(false);
    expect(returnToMatches('https://a.b/c?x=1', 'still-not-a-url')).toBe(false);
  });

  it('parseSteamClaimedId returns null for wrong path pattern', () => {
    // Not 17 digits
    expect(parseSteamClaimedId('https://steamcommunity.com/openid/id/123')).toBeNull();
  });
});
