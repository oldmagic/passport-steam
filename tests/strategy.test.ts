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

describe('SteamStrategy', () => {
  const baseOpts: StrategyOptions = {
    realm: 'https://example.com/',
    returnURL: 'https://example.com/auth/steam/return',
    allowedReturnHosts: ['example.com'],
    state: { store: new MemStateStore() as any },
    nonceStore: new MemNonceStore() as any,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initiates redirect with proper location', async () => {
  const strat = new SteamStrategy(baseOpts, () => {});
  const req = makeReq('/auth/steam');
  (strat as any).redirect = vi.fn();
  await (strat as any)._authenticate(req);
  expect((strat as any).redirect).toHaveBeenCalledTimes(1);
  const firstCall = (strat as any).redirect.mock.calls[0]!;
  const location = String(firstCall[0]);
  const url = new URL(location);
    expect(url.origin + url.pathname).toBe('https://steamcommunity.com/openid/login');
  });

  it('handles callback success path', async () => {
    // Prepare a state key stored
    const sstore = (baseOpts.state!.store as MemStateStore);
    const state = 'abc123';
    sstore.set(`steam:${state}`, state);

    // Mock global fetch for check_authentication
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      text: async () => 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n',
      json: async () => ({})
    } as any);

  const strat = new SteamStrategy(baseOpts, (profile, done) => done(null, { id: profile.id }));
    const nowIso = new Date().toISOString().replace(/\..*/, 'Z');
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'id_res',
      'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
      'openid.return_to': 'https://example.com/auth/steam/return?state=' + state,
      'openid.realm': 'https://example.com/',
      'openid.response_nonce': `${nowIso}xyz`,
      'openid.assoc_handle': 'foo',
      'openid.sig': 'bar',
      'openid.signed': 'signed,fields'
    });
  params.set('state', state);
    const req = makeReq('/auth/steam/return?' + params.toString());

  ;(strat as any).success = vi.fn();
  ;(strat as any).error = vi.fn();
  await (strat as any)._authenticate(req);
  expect((strat as any).success).toHaveBeenCalledWith({ id: '76561198000000000' }, undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
