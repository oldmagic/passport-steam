# Security checklist — Steam OpenID 2.0 (RP)

Use this to validate your integration and our strategy behavior.

Core OpenID 2.0 verification
- Require HTTPS everywhere in production. Enforce HSTS (via Helmet) at the app layer. [Helmet docs]
- Validate `openid.return_to` equals the exact callback URL being processed (path and query), per spec §11.1.2. Reject on mismatch. [OpenID 2.0]
- Ensure the `realm` you send matches your deployment origin; verify callback is within that realm. [OpenID 2.0]
- After callback, POST all OpenID params back to Steam with `openid.mode=check_authentication` and require `is_valid:true`. Reject otherwise. [OpenID 2.0]
- Parse and validate `openid.response_nonce`: check freshness (e.g., within 5 minutes) and ensure single-use by storing seen nonces. [OpenID 2.0 §11.4]

Steam specifics
- OP endpoint is `https://steamcommunity.com/openid/login`. Do not use other hosts. [Steam docs]
- Verify `openid.claimed_id` host is `steamcommunity.com` and path matches `/openid/id/<steamid>`. Extract `<steamid>` only after this check. [Steam docs]

CSRF/state
- Generate a strong, random `state` tied to the user session and embed it in `return_to`. Verify on callback and invalidate after use. [OWASP CSRF]
- Regenerate the session ID upon successful login (session fixation defense). [express-session docs]

Open redirect and host allowlist
- Maintain a strict allowlist of post-login redirect destinations or use server-side route mapping. Do not trust query-provided redirect targets. [OWASP Redirects]
- Enforce `allowedReturnHosts` when validating incoming callbacks if your app spans multiple hostnames.

Header/host hygiene
- In Express, set `app.set('trust proxy', 1)` when behind a proxy and construct absolute URLs from a configured base origin to prevent host header poisoning.

Cookies/session
- Use `express-session` with: `cookie: { httpOnly: true, sameSite: 'lax' or 'strict', secure: true in prod }`. Rotate `secret` periodically (array of secrets). [express-session]

Optional profile fetch
- If using Steam Web API to fetch profile, handle network errors/timeouts, and respect rate limits. Treat profile data as untrusted input; validate and sanitize before use.

Logging and error handling
- Log rejected verifications with minimal PII. Never log full query strings containing session or state identifiers in production logs.

Monitoring
- Alert on spikes of invalid assertions, nonce replays, or realm/return_to mismatches.

Citations
- OpenID 2.0: https://openid.net/specs/openid-authentication-2_0.html
- Steam OpenID endpoint details: https://partner.steamgames.com/doc/features/auth#openid
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Unvalidated Redirects: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
- Node/Express session hardening: https://www.npmjs.com/package/express-session
- Helmet: https://www.npmjs.com/package/helmet
