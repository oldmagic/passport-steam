import { describe, it, expect, vi } from 'vitest';
import { SteamStrategy } from '../src/SteamStrategy.js';
import type { StrategyOptions } from '../src/types.js';

class MemStateStore { m = new Map<string, string>(); set(k:string,v:string){this.m.set(k,v);} get(k:string){return this.m.get(k);} delete(k:string){this.m.delete(k);} }
class AlwaysSeenNonce { putOnce(){ return false; } }
class FreshNonce { putOnce(){ return true; } }

function makeReq(url: string) {
  return {
    method: 'GET',
    url,
    originalUrl: url,
    headers: { host: 'example.com' },
    protocol: 'https',
    query: Object.fromEntries(new URL('https://example.com' + url).searchParams.entries()),
  } as any;
}

function baseOpts(overrides: Partial<StrategyOptions> = {}): StrategyOptions {
  return {
    realm: 'https://example.com/',
    returnURL: 'https://example.com/auth/steam/return',
    allowedReturnHosts: ['example.com'],
    state: { store: new MemStateStore() as any },
    nonceStore: new FreshNonce() as any,
    ...overrides,
  };
}

function makeParams(state: string, extra: Record<string,string> = {}) {
  const nowIso = new Date().toISOString().replace(/\..*/, 'Z');
  const p = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'id_res',
    'openid.claimed_id': 'https://steamcommunity.com/openid/id/76561198000000000',
    'openid.identity': 'https://steamcommunity.com/openid/id/76561198000000000',
    'openid.return_to': 'https://example.com/auth/steam/return?state=' + state,
    'openid.realm': 'https://example.com/',
    'openid.response_nonce': `${nowIso}xyz`,
    'openid.assoc_handle': 'foo',
    'openid.sig': 'bar',
    'openid.signed': 'signed,fields',
    state,
    ...extra,
  });
  return p;
}

describe('SteamStrategy failure paths', () => {
  it('fails on unexpected mode', async () => {
    const opts = baseOpts();
    const sstore = opts.state!.store as MemStateStore; sstore.set('steam:s', 's');
    const params = makeParams('s'); params.set('openid.mode','cancel');
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
  });

  it('fails on realm mismatch', async () => {
    const opts = baseOpts({ realm: 'https://other.com/' });
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const params = makeParams('s');
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
  });

  it('fails on disallowed host', async () => {
    const opts = baseOpts({ allowedReturnHosts: ['other.com'] });
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const params = makeParams('s');
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
  });

  it('fails on stale nonce', async () => {
    const opts = baseOpts();
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const old = new Date(0).toISOString().replace(/\..*/, 'Z');
    const params = makeParams('s');
    params.set('openid.response_nonce', `${old}zzz`);
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
  });

  it('fails on replayed nonce', async () => {
    const opts = baseOpts({ nonceStore: new AlwaysSeenNonce() as any });
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const params = makeParams('s');
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
  });

  it('fails on invalid claimed_id host', async () => {
    const opts = baseOpts();
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const params = makeParams('s');
    params.set('openid.claimed_id','https://evil.com/openid/id/76561198000000000');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('fails on missing required OpenID params', async () => {
    const opts = baseOpts();
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?openid.mode=id_res'));
    expect((strat as any).fail).toHaveBeenCalled();
  });

  it('succeeds when state present via return_to/top-level', async () => {
    const opts = baseOpts();
    const sstore = (opts.state!.store as MemStateStore);
    sstore.set('steam:state1', 'state1');
    const p = makeParams('state1');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any);
    const strat = new SteamStrategy(opts, (profile, done) => done(null, { id: profile.id }));
    (strat as any).success = vi.fn(); (strat as any).error = vi.fn(); (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + p));
    expect((strat as any).success).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('fails on check_authentication invalid', async () => {
    const opts = baseOpts();
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const params = makeParams('s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true, text: async ()=>'is_valid:false', json: async()=>({}) } as any);
    const strat = new SteamStrategy(opts, () => {});
    (strat as any).fail = vi.fn(); (strat as any).error = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).fail).toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('success with optional profile fetch', async () => {
    const opts = baseOpts({ apiKey: 'k' });
    const sstore = (opts.state!.store as MemStateStore); sstore.set('steam:s', 's');
    const params = makeParams('s');
    const fetchMock = vi.spyOn(globalThis, 'fetch' as any)
      // check_authentication
      .mockResolvedValueOnce({ ok: true, text: async ()=>'is_valid:true', json: async()=>({}) } as any)
      // profile
      .mockResolvedValueOnce({ ok: true, json: async()=>({ response: { players: [{ steamid: '76561198000000000', personaname: 'P', avatarfull: 'u' }] } }) } as any);
    const strat = new SteamStrategy(opts, (profile, done) => done(null, { id: profile.id }));
    (strat as any).success = vi.fn(); (strat as any).error = vi.fn(); (strat as any).fail = vi.fn();
    await (strat as any)._authenticate(makeReq('/auth/steam/return?' + params));
    expect((strat as any).success).toHaveBeenCalled();
    fetchMock.mockRestore();
  });
});
