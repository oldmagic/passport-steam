import { describe, it, expect } from 'vitest';
import { returnToMatches } from '../src/utils/validation.js';

describe('returnToMatches', () => {
  it('accepts when current has all return_to params plus extras', () => {
    const rt = 'https://example.com/cb?state=abc&x=1';
    const cur = 'https://example.com/cb?state=abc&x=1&openid.mode=id_res';
    expect(returnToMatches(cur, rt)).toBe(true);
  });
  it('rejects when a required param is different', () => {
    const rt = 'https://example.com/cb?state=abc';
    const cur = 'https://example.com/cb?state=zzz';
    expect(returnToMatches(cur, rt)).toBe(false);
  });
  it('rejects when host or path mismatches', () => {
    expect(returnToMatches('https://other.com/cb?state=abc', 'https://example.com/cb?state=abc')).toBe(false);
    expect(returnToMatches('https://example.com/other?state=abc', 'https://example.com/cb?state=abc')).toBe(false);
  });
  it('rejects invalid URLs', () => {
    expect(returnToMatches('not-a-url', 'also-not')).toBe(false);
  });
});
