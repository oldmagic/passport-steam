# passport-steam-modern

[![CI](https://github.com/oldmagic/passport-steam/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/oldmagic/passport-steam/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/passport-steam-modern?logo=npm)](https://www.npmjs.com/package/passport-steam-modern)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Modern, secure, and minimal-dependency Passport strategy for Steam OpenID 2.0, written in TypeScript and built for Node 20+.

Progress: Prompt 8/10

## Why this package

- Strict OpenID 2.0 verification against Steam OP (check_authentication)
- CSRF state and nonce freshness with replay protection
- Host allowlist + realm/return_to validation to prevent open redirects
- Dual ESM/CJS builds with type definitions, no heavy HTTP client
- Strong tests and coverage; example app included

## Install

```bash
npm install passport-steam-modern passport
```

Peer dependency: passport@^0.7. Node >= 20.

## Quick start

```ts
import passport from 'passport';
import express from 'express';
import session from 'express-session';
import { SteamStrategy } from 'passport-steam-modern';

const app = express();
app.use(session({ secret: process.env.SESSION_SECRET!, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as any));

passport.use(new SteamStrategy({
	realm: 'https://example.com/',
	returnURL: 'https://example.com/auth/steam/return',
	allowedReturnHosts: ['example.com'],
	// Optional extras
	// apiKey: process.env.STEAM_API_KEY,
	// state: { store },
	// nonceStore,
}, (profile, done) => {
	// Find or create user by profile.id
	done(null, { id: profile.id, name: profile.displayName });
}));

app.get('/auth/steam', passport.authenticate('steam'));
app.get('/auth/steam/return', passport.authenticate('steam', { failureRedirect: '/login' }), (req, res) => {
	res.redirect('/');
});
```

See a hardened example in `examples/express/`.

## Strategy options

- realm: Base URL (origin + path prefix) your callbacks will live under. Example: `https://example.com/` or `https://example.com/app`.
- returnURL: Absolute callback URL for Steam to send the assertion to.
- allowedReturnHosts?: string[] — explicit allowlist for callback hosts; include your expected host(s).
- apiKey?: string — if provided, attempts to fetch a minimal Steam profile after auth; failures don’t block login.
- state?: { generate?(): string | Promise<string>; store: StateStore } — provide a store to verify CSRF state.
- nonceStore?: NonceStore — provide a store to reject replayed nonces.

Types for StateStore and NonceStore are exported. If you don’t provide `state.store` or `nonceStore`, corresponding protections are skipped.

## Security defaults

This strategy enforces:

- return_to subset matching: the current callback URL must include all query params from return_to with identical values
- realm check: current URL must be under the configured realm
- host allowlist: callback host must be in `allowedReturnHosts`
- nonce freshness: OpenID `response_nonce` time is checked with a default 5-minute skew and stored once when a store is provided
- check_authentication: every assertion is verified with Steam
- claimed_id validation: must be steamcommunity.com/openid/id/[17 digits]

Read `docs/SECURITY-CHECKLIST-STEAM-OPENID2.md`, `docs/ADR-0001-openid2-steam.md`, and `SECURITY.md` for details and citations.

References:
- OpenID 2.0 spec — Authentication 2.0 (final): http://openid.net/specs/openid-authentication-2_0.html
- OWASP CSRF Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Unvalidated Redirects: https://owasp.org/www-community/attacks/Unvalidated_Redirects_and_Forwards_Cheat_Sheet

## API reference

Minimal types:

- SteamProfile: `{ id: string; displayName?: string; photos?: { value: string }[] }`
- StrategyOptions: documented above

Named exports:

- `SteamStrategy`
- Utility types and helpers under `src/utils/*` are not part of the public API and may change.

Generate HTML docs:

```bash
npm run docs
```

Docs will be generated to `docs/api/` (see `typedoc.json`).

### Usage with CommonJS

```js
const passport = require('passport');
const { SteamStrategy } = require('passport-steam-modern');

passport.use(new SteamStrategy({
	realm: 'https://example.com/',
	returnURL: 'https://example.com/auth/steam/return',
	allowedReturnHosts: ['example.com'],
}, (profile, done) => done(null, { id: profile.id })));
```

## Troubleshooting

- return_to mismatch: ensure your externally visible URL (proto/host/path) matches what Express reports behind proxies; set trust proxy and use X-Forwarded-Proto/Host properly.
- realm mismatch: update `realm` to match the real external origin and path prefix.
- Invalid state: ensure you provide a working `state.store` and that you persist across requests.
- Replay detected: add a `nonceStore` that stores nonces for at least 10 minutes.

FAQ:
- Behind a proxy, callback builds http:// instead of https:// — Set Express trust proxy and ensure your proxy forwards `X-Forwarded-Proto: https`. See https://expressjs.com/en/guide/behind-proxies.html
- Invalid claimed_id host or format — Ensure you’re not rewriting the Steam OP response and that claimed_id is like `https://steamcommunity.com/openid/id/7656119...`.

## Example app

See `examples/express/README.md`. It includes secure session settings and Helmet.

## License

MIT © Contributors

---

## Advanced topics

### Security hardening

- Always provide `allowedReturnHosts` for explicit host allowlisting to reduce open-redirect surfaces (OWASP).
- Use `state.store` to verify CSRF state and `nonceStore` to prevent replay. See OWASP CSRF guidance.
- Prefer HTTPS end-to-end. For proxies/load balancers, enable Express trust proxy and set secure cookies.

### Proxies and HTTPS

- Express behind proxies: https://expressjs.com/en/guide/behind-proxies.html
- express-session cookie security flags: https://www.npmjs.com/package/express-session
- This strategy derives the absolute URL from headers (`X-Forwarded-Proto`, `Host`) when available.

### Optional Steam profile fetch

- If `apiKey` is provided, the strategy fetches minimal profile data via `ISteamUser.GetPlayerSummaries` v2 and ignores errors so login isn’t blocked.
- Steam Web API docs: https://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerSummaries_.28v0002.29

### TypeScript tips

- The package ships ESM and CJS; TS config uses NodeNext. Import as named exports only: `import { SteamStrategy } from 'passport-steam-modern'`.
- Public types: `SteamProfile`, `StrategyOptions`, `StateStore`, `NonceStore`.

### Migration

From `passport-steam`:
- Options rename/simplification. Use `realm`, `returnURL`, and `allowedReturnHosts` (explicit allowlist). CSRF state and nonce are opt-in via stores.
- This package always performs OpenID `check_authentication` back to Steam per spec.

From `node-steam-signin`:
- Integrate via Passport instead of direct middleware. Map your handler to Passport’s `verify` callback.

### Links

- Example app: `examples/express/`
- API docs: `docs/api/`

# passport-steam