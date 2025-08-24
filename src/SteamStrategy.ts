import { Strategy as PassportStrategyBase } from 'passport-strategy';
import { URL, URLSearchParams } from 'node:url';
import type { StrategyOptions, SteamProfile } from './types.js';
import { buildAuthRedirectURL, postCheckAuthentication } from './utils/openid.js';
import { isAllowedHost, isFreshNonce, parseSteamClaimedId, urlsEqual, withinRealm, returnToMatches } from './utils/validation.js';
import { verifyAndConsumeState } from './utils/state.js';
import { storeNonceOnce } from './utils/nonce.js';

export class SteamStrategy extends PassportStrategyBase {
  override name = 'steam';
  private opts: StrategyOptions;

  constructor(
    options: StrategyOptions,
    private verify: (profile: SteamProfile, done: (err: any, user?: any, info?: any) => void) => void
  ) {
    super();
    this.opts = options;
  }

  // Passport entry point
  override authenticate(req: any): void {
    void this._authenticate(req);
  }

  private async _authenticate(req: any): Promise<void> {
    try {
      const method = (req.method || 'GET').toUpperCase();
      const isCallback = method === 'GET' && req.url && (req.query?.['openid.mode'] || req.query?.openid_mode);

      if (!isCallback) {
        // Initiate authentication: generate state and build return_to with stateKey
        const state = await this.opts.state?.generate?.() ?? cryptoRandom();
        const stateKey = `steam:${state}`;
        await this.opts.state?.store?.set?.(stateKey, state, 10 * 60 * 1000);

        const returnTo = new URL(this.opts.returnURL);
        returnTo.searchParams.set('state', state);

        const url = buildAuthRedirectURL(this.opts.realm, returnTo.toString());
        return this.redirect(url);
      }

      // Callback handling
      const qs = new URLSearchParams(req.url?.split('?')[1] || '');
      // Pull from either req.query or parsed qs to be robust
      const openidMode = (req.query?.['openid.mode'] ?? qs.get('openid.mode')) as string | null;
      if (!openidMode) return this.fail({ message: 'Missing openid.mode' }, 400);
      if (openidMode !== 'id_res') return this.fail({ message: `Unexpected mode ${openidMode}` }, 400);

      const returnToReceived = (req.query?.['openid.return_to'] ?? qs.get('openid.return_to')) as string | null;
      const realmReceived = (req.query?.['openid.realm'] ?? qs.get('openid.realm')) as string | null;
      const claimedId = (req.query?.['openid.claimed_id'] ?? qs.get('openid.claimed_id')) as string | null;
      const responseNonce = (req.query?.['openid.response_nonce'] ?? qs.get('openid.response_nonce')) as string | null;

      if (!returnToReceived || !realmReceived || !claimedId || !responseNonce) {
        return this.fail({ message: 'Missing required OpenID params' }, 400);
      }

      // Verify return_to equals our current callback URL
      const currentUrl = absoluteFromReq(req);
  if (!returnToMatches(currentUrl, returnToReceived)) {
        return this.fail({ message: 'return_to mismatch' }, 400);
      }

      // Verify realm and allowed return hosts
      if (!withinRealm(this.opts.realm, currentUrl)) {
        return this.fail({ message: 'realm mismatch' }, 400);
      }
      if (!isAllowedHost(currentUrl, this.opts.allowedReturnHosts)) {
        return this.fail({ message: 'disallowed host' }, 400);
      }

      // CSRF state
      let state = (req.query?.['state'] ?? qs.get('state')) as string | null;
      if (!state) {
        try { state = new URL(returnToReceived).searchParams.get('state'); } catch {}
      }
      if (!state) return this.fail({ message: 'Missing state' }, 400);
      if (this.opts.state?.store) {
        const ok = await verifyAndConsumeState(this.opts.state.store, `steam:${state}`, state);
        if (!ok) return this.fail({ message: 'Invalid state' }, 400);
      }

      // Nonce freshness
      if (!isFreshNonce(responseNonce)) return this.fail({ message: 'Stale nonce' }, 400);
      if (this.opts.nonceStore) {
        const stored = await storeNonceOnce(this.opts.nonceStore, responseNonce, 10 * 60 * 1000);
        if (!stored) return this.fail({ message: 'Replay detected' }, 400);
      }

      // Send check_authentication back to Steam
      const params = new URLSearchParams(req.url?.split('?')[1] || '');
      const result = await postCheckAuthentication(params);
      if (!/true/i.test(result['is_valid'] || '')) {
        return this.fail({ message: 'Assertion not valid' }, 401);
      }

      // Verify claimed_id and extract steamid
      const steamid = parseSteamClaimedId(claimedId);
      if (!steamid) return this.fail({ message: 'Invalid claimed_id host or format' }, 400);

      // Optional profile fetch
      let profile: SteamProfile = { id: steamid };
      if (this.opts.apiKey) {
        try {
          const p = await fetchProfile(this.opts.apiKey, steamid);
          if (p) profile = p;
        } catch {
          // ignore profile errors to not block login
        }
      }

  return this.verify(profile, (err, user, info) => {
        if (err) return this.error(err);
        if (!user) return this.fail(info || { message: 'Unauthorized' }, 401);
        return this.success(user, info);
      });
    } catch (err) {
      return this.error(err as Error);
    }
  }
}

function absoluteFromReq(req: any): string {
  const proto = (req.headers?.['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers?.host as string) || req.get?.('host');
  const path = req.originalUrl || req.url || '';
  return `${proto}://${host}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function fetchProfile(apiKey: string, steamid: string): Promise<SteamProfile | null> {
  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('steamids', steamid);
  const r = await fetch(url, { method: 'GET' });
  if (!r.ok) return null;
  const j = (await r.json()) as any;
  const player = j?.response?.players?.[0];
  if (!player) return null;
  return {
    id: String(player.steamid),
    displayName: player.personaname,
    photos: player.avatarfull ? [{ value: player.avatarfull }] : undefined,
  } as SteamProfile;
}

function cryptoRandom(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    // @ts-ignore
    return (crypto as any).randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
