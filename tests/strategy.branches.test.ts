import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SteamStrategy } from '../src/SteamStrategy.js';
import type { StrategyOptions } from '../src/types.js';

function makeReq(url: string, extras: any = {}) {
  return {
    method: 'GET',
    url,
    originalUrl: url,
    headers: { host: 'example.com' },
    protocol: 'https',
    query: Object.fromEntries(new URL('https://example.com' + url).searchParams.entries()),
    ...extras,
  } as any;
}

class MemStateStore {
  map = new Map<string, string>();
  set(k: string, v: string) { this.map.set(k, v); }
  get(k: string) { return this.map.get(k); }
  delete(k: string) { this.map.delete(k); }
}

class MemNonceStore { set = new Set<string>(); putOnce(n: string) { if (this.set.has(n)) return false; this.set.add(n); return true; } }

function baseOpts(overrides: Partial<StrategyOptions> = {}): StrategyOptions {
  return {
    realm: 'https://example.com/',
    returnURL: 'https://example.com/auth/steam/return',
    allowedReturnHosts: ['example.com'],
    state: { store: new MemStateStore() as any },
    nonceStore: new MemNonceStore() as any,
    ...overrides,
  };
}

function makeParams(overrides: Partial<Record<string, string>> = {}) {
  const nowIso = new Date().toISOString().replace(/\..*/, 'Z');
  return new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
    'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
    'openid.return_to': 'https://example.com/auth/steam/return',
    'openid.realm': 'https://example.com/',
    'openid.response_nonce': `${nowIso}xyz`,
    'openid.assoc_handle': 'foo',
    'openid.sig': 'bar',
    'openid.signed': 'signed,fields',
    ...overrides,
  });
}

describe('SteamStrategy additional branch paths', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uses custom state generator and stores state in return_to', async () => {
    const genState = vi.fn().mockReturnValue('GEN');
    const store = new MemStateStore();
    const strat = new SteamStrategy(baseOpts({ state: { generate: genState, store: store as any } }), () => {});
    (strat as any).redirect = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam'));
    expect(genState).toHaveBeenCalled();
    const url = new URL((strat as any).redirect.mock.calls[0][0]);
    const return_to = url.searchParams.get('openid.return_to')!;
    expect(return_to).toContain('state=GEN');
    expect(store.get('steam:GEN')).toBe('GEN');
  });

  it('fails when return_to does not match current URL', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ 'openid.return_to': 'https://example.com/auth/steam/return?state=DIFF', state: 's' });
    const strat = new SteamStrategy(baseOpts({ state: { store: store as any } }), () => {});
    (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalledWith(expect.objectContaining({ message: 'return_to mismatch' }), 400);
  });

  it('fails when state is missing', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams(); // no top-level state
    // and ensure return_to lacks state as well
    params.set('openid.return_to', 'https://example.com/auth/steam/return');
    const strat = new SteamStrategy(baseOpts({ state: { store: store as any } }), () => {});
    (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalledWith(expect.objectContaining({ message: 'Missing state' }), 400);
  });

  it('fails when state cannot be verified/consumed', async () => {
    const params = makeParams({ state: 'bad' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=bad');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
    const strat = new SteamStrategy(baseOpts(), () => {});
    (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid state' }), 400);
    fetchMock.mockRestore();
  });

  it('treats legacy openid_mode as callback but fails with missing openid.mode', async () => {
    // isCallback true due to req.query.openid_mode, but later openid.mode is missing
    const store = new MemStateStore(); store.set('steam:s', 's');
    const nowIso = new Date().toISOString().replace(/\..*/, 'Z');
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid_mode': 'id_res',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.return_to': 'https://example.com/auth/steam/return?state=s',
      'openid.realm': 'https://example.com/',
      'openid.response_nonce': `${nowIso}xyz`,
      state: 's',
    } as any);
    const strat = new SteamStrategy(baseOpts({ state: { store: store as any } }), () => {});
    (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params.toString()));
    expect((strat as any).fail).toHaveBeenCalledWith(expect.objectContaining({ message: 'Missing openid.mode' }), 400);
  });

  it('still succeeds if optional profile fetch throws', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ state: 's' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any)
      // check_authentication
      .mockResolvedValueOnce({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any)
      // profile fetch throws
      .mockRejectedValueOnce(new Error('boom'));
    const strat = new SteamStrategy(baseOpts({ apiKey: 'k', state: { store: store as any } }), (profile, done) => done(null, { id: profile.id }));
    (strat as any).success = vi.fn(); (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).success).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('calls fail when verify denies user', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ state: 's' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
    const strat = new SteamStrategy(baseOpts({ state: { store: store as any } }), (_profile, done) => done(null, false));
    (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalledWith(expect.any(Object), 401);
    fetchMock.mockRestore();
  });

  it('calls error when verify passes error', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ state: 's' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
    const strat = new SteamStrategy(baseOpts(), (_profile, done) => done(new Error('nope')));
    (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).error).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('calls error on check_authentication network error (outer catch)', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ state: 's' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockRejectedValue(new Error('net')); // first fetch throws
    const strat = new SteamStrategy(baseOpts(), () => {});
    (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).error).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('succeeds without state/nonce stores and without allowedReturnHosts (skips verifications)', async () => {
    const nowIso = new Date().toISOString().replace(/\..*/, 'Z');
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'id_res',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.return_to': 'https://example.com/auth/steam/return?state=nostores',
      'openid.realm': 'https://example.com/',
      'openid.response_nonce': `${nowIso}xyz`,
      'openid.assoc_handle': 'foo',
      'openid.sig': 'bar',
      'openid.signed': 'signed,fields',
      state: 'nostores',
    });
  const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
  const opts: StrategyOptions = { realm: 'https://example.com/', returnURL: 'https://example.com/auth/steam/return' } as any;
  const strat = new SteamStrategy(opts, (p, d) => d(null, { id: p.id }));
  (strat as any).success = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).success).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('profile fetch returns non-ok response and is ignored', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ state: 's' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any)
      // check_authentication
      .mockResolvedValueOnce({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any)
      // profile non-ok
      .mockResolvedValueOnce({ ok: false } as any);
    const strat = new SteamStrategy(baseOpts({ apiKey: 'k', state: { store: store as any } }), (profile, done) => done(null, { id: profile.id }));
    (strat as any).success = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).success).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('allowedReturnHosts passes when current host is in list', async () => {
    const store = new MemStateStore(); store.set('steam:s', 's');
    const params = makeParams({ state: 's' });
    params.set('openid.return_to', 'https://example.com/auth/steam/return?state=s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
    const strat = new SteamStrategy(baseOpts({ allowedReturnHosts: ['example.com', 'other.com'], state: { store: store as any } }), (p, d) => d(null, { id: p.id }));
    (strat as any).success = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).success).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('cryptoRandom fallback path when crypto.randomUUID is absent', async () => {
    const oldCrypto = (globalThis as any).crypto;
    const mockCrypto = {};
    try {
      Object.defineProperty(globalThis as any, 'crypto', { configurable: true, value: mockCrypto });
      const strat = new SteamStrategy(baseOpts(), () => {});
      (strat as any).redirect = vi.fn(); (strat as any).error = vi.fn();
      await (strat as any)._authenticate(makeReq('/auth/steam'));
      expect((strat as any).redirect).toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis as any, 'crypto', { configurable: true, value: oldCrypto });
    }
  });
});
