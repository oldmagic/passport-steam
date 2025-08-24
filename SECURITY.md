# Security review and threat model

Progress: Prompt 8/10

This document outlines the threat model for the Steam OpenID 2.0 flow, how the implementation mitigates risks, and an integration checklist.

## Threat model

Assets
- Authentication endpoints: `/auth/steam` (init) and `/auth/steam/return` (callback)
- User session and identity (Post-auth application session)

Actors
- User agent (browser)
- Relying Party (this library in your app)
- OpenID Provider (Steam: steamcommunity.com)
- Network adversary on the client side

Trust boundaries
- Between browser and your app (TLS required)
- Between your app and Steam OP (TLS required)
- Reverse proxy/load balancer ↔ app (headers like X-Forwarded-Proto/Host)

## Risks and mitigations

1) CSRF against the callback
- Risk: Attacker forges a GET to your callback.
- Mitigation: CSRF state token stored server-side and verified/consumed once.
  - Code: `src/SteamStrategy.ts` (state extraction + `verifyAndConsumeState`), `src/utils/state.ts`
  - Guidance: Provide `state.store` in `StrategyOptions`.
  - Reference: OWASP CSRF Cheat Sheet.

2) Replay attacks (OpenID response_nonce reuse)
- Risk: Reusing valid OpenID responses.
- Mitigation: Nonce freshness check (timestamp skew) and single-use storage.
  - Code: `isFreshNonce` in `src/utils/validation.ts`; `storeNonceOnce` in `src/utils/nonce.ts`
  - Guidance: Provide a durable `nonceStore` (TTL ≥10 minutes).

3) Open redirect and return_to tampering
- Risk: Abusing return_to to bounce user to unintended targets.
- Mitigation: Subset match between current URL and `openid.return_to` and strict host allowlist.
  - Code: `returnToMatches`, `isAllowedHost` in `src/utils/validation.ts`
  - Options: `allowedReturnHosts` in `StrategyOptions` (required in production).
  - Reference: OWASP Unvalidated Redirects.

4) realm/return_to mismatch
- Risk: Assertions valid but for a different realm.
- Mitigation: Enforce realm origin/path prefix with `withinRealm`.
  - Code: `withinRealm` in `src/utils/validation.ts`.

5) claimed_id spoofing
- Risk: Attacker crafts a claimed_id not belonging to Steam.
- Mitigation: Verify host and exact path format; extract only 17-digit IDs.
  - Code: `parseSteamClaimedId` in `src/utils/validation.ts`.

6) Signature/authentication integrity
- Risk: Accepting forged id_res without verification.
- Mitigation: Always POST back with `openid.mode=check_authentication` and require `is_valid:true`.
  - Code: `postCheckAuthentication` in `src/utils/openid.ts`.
  - Reference: OpenID 2.0 spec.

7) Host header poisoning / proxy issues
- Risk: Absolute URL built from untrusted headers leads to mismatches.
- Mitigation: Strategy builds absolute URL using `X-Forwarded-Proto` and `Host` if present; integrators must set trust proxy correctly so Express exposes correct values.
  - Code: `absoluteFromReq` in `src/SteamStrategy.ts`.
  - Guidance: Enable Express trust proxy and ensure your proxy sets `X-Forwarded-Proto`.

8) Session fixation
- Risk: Reusing pre-auth session IDs post-login.
- Mitigation: Regenerate session on login in the example app.
  - Code: `examples/express/server.js` (login path with regeneration guidance).
  - Reference: OWASP Session Fixation.

9) Cookie security
- Risk: Session cookie theft or CSRF.
- Mitigation: `httpOnly`, `secure`, `sameSite` cookies; HTTPS required in production.
  - Code: `examples/express/server.js` (session cookie flags); Helmet recommended.

10) Timing attacks on state
- Risk: Leaking equality through timing.
- Mitigation: Constant-time comparison for state.
  - Code: `safeEqual` in `src/utils/state.ts`.

## Integration checklist

- Provide `allowedReturnHosts` with your production host(s).
- Configure `realm` and `returnURL` to match externally visible URLs.
- Implement and pass a durable `state.store` (e.g., Redis) and `nonceStore` (single-use nonces).
- Behind proxies: set Express `app.set('trust proxy', 1)` and ensure `X-Forwarded-Proto/Host` are set.
- Regenerate session on successful login; set session cookie flags (`secure`, `httpOnly`, `sameSite`).
- Enforce HTTPS end-to-end.
- Rate-limit the callback route and log anomalies (mismatches, invalid state, stale nonce).
- Keep your `apiKey` secret; profile fetch is optional and failure-tolerant.

## References

- OpenID Authentication 2.0: http://openid.net/specs/openid-authentication-2_0.html
- OWASP CSRF Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Unvalidated Redirects: https://owasp.org/www-community/attacks/Unvalidated_Redirects_and_Forwards_Cheat_Sheet
- OWASP Session Fixation: https://owasp.org/www-community/attacks/Session_fixation
- Express behind proxies: https://expressjs.com/en/guide/behind-proxies.html
