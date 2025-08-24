import { describe, it, expect } from 'vitest';
import { generateState, verifyAndConsumeState, type StateStore } from '../src/utils/state.js';
import { storeNonceOnce, type NonceStore } from '../src/utils/nonce.js';

class MemState implements StateStore {
  map = new Map<string, string>();
  set(k: string, v: string): void { this.map.set(k, v); }
  get(k: string): string | undefined { return this.map.get(k); }
  delete(k: string): void { this.map.delete(k); }
}

class MemNonce implements NonceStore {
  set = new Set<string>();
  putOnce(n: string): boolean { if (this.set.has(n)) return false; this.set.add(n); return true; }
}

describe('state and nonce', () => {
  it('generateState returns hex-like string', () => {
    const s = generateState();
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThanOrEqual(16);
  });

  it('verifyAndConsumeState succeeds once then fails', async () => {
    const store = new MemState();
    store.set('k', 'v');
    expect(await verifyAndConsumeState(store, 'k', 'v')).toBe(true);
    expect(await verifyAndConsumeState(store, 'k', 'v')).toBe(false);
  });

  it('storeNonceOnce returns true then false on replay', async () => {
    const store = new MemNonce();
    expect(await storeNonceOnce(store, 'n', 1000)).toBe(true);
    expect(await storeNonceOnce(store, 'n', 1000)).toBe(false);
  });
});
