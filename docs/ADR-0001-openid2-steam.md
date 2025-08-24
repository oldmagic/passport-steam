# ADR-0001: Modern Passport strategy for Steam OpenID 2.0

Status: Accepted

Date: 2025-08-24

## Context

We need a modern, TypeScript-first Passport strategy that implements Steam sign-in via OpenID 2.0 with strong security, minimal dependencies, and dual ESM/CJS output targeting Node 20/22. Steam acts as an OpenID Provider (OP) at `https://steamcommunity.com/openid/login` for both user authentication (`checkid_setup`) and assertion verification (`check_authentication`). The relying party (RP) must implement OpenID 2.0 verification correctly (return_to and realm checks, nonce/replay prevention, signature verification) and add layered defenses (CSRF/state, open-redirect prevention, strict host allowlist) suitable for web apps.

Key constraints
- Node 20/22, TypeScript strict mode, named exports, tree-shakeable.
- Dual ESM/CJS build with types, minimal runtime deps.
- Security: defend against CSRF, replay, open redirects, claimed_id spoofing; validate `return_to` vs current URL and realm.

References
- OpenID Authentication 2.0 spec (RP responsibilities: verifying assertions, replay protection, `return_to` match) [openid.net/specs/openid-authentication-2_0.html](https://openid.net/specs/openid-authentication-2_0.html) — esp. sections 11 (Positive Assertions), 11.1.2 (Verifying `return_to`), 11.3 (Signature verification), 11.4 (Nonce), 13.2 (Verifying Assertions), and 15 (Security Considerations).
- Steamworks “Sign in through Steam” OpenID notes (OP endpoint and claimed_id format) [partner.steamgames.com](https://partner.steamgames.com/doc/features/auth#openid).
- OWASP Cheat Sheets: CSRF Prevention and Unvalidated Redirects/Forwards [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html).
- Node.js 20+ global fetch (Undici) [nodejs.org API docs](https://nodejs.org/api/globals.html#fetch).

## Decision

1) Implement a minimal OpenID 2.0 RP internally using Web APIs available in Node 20/22
- Use URL/URLSearchParams for parameter construction and validation; use global `fetch` to POST `openid.mode=check_authentication` to Steam; parse form-encoded responses.
- Avoid external OpenID 2.0 libraries to keep the attack surface and maintenance burden low. Rely on the OP signature validation via `check_authentication` (stateless), as allowed by the spec (section 11.3/13.2).

2) Passport integration without heavy helpers
- Provide a Strategy class with `authenticate(req, options)` that integrates with Passport. To ensure compatibility with Passport’s lifecycle helpers (`success`, `fail`, `error`, `redirect`), we will depend on the tiny, stable `passport-strategy` package at runtime. `passport` itself remains a peer dep for consumers.

3) Security posture built-in to the strategy
- CSRF/state: Embed a cryptographically strong `state` in `return_to` and verify it against server-side storage on callback (OWASP CSRF guidance). The state must be single-use.
- Replay protection: Validate `openid.response_nonce` structure/timestamp (per spec 11.4) and reject if outside a short window (e.g., 5 minutes) or previously seen.
- `return_to` and `realm`: Verify that the `openid.return_to` query exactly matches the callback URL used (spec 11.1.2) and is within the configured `realm`. Reject on mismatch.
- Open redirect defense: After successful login, only redirect to server-side mapped routes or a strict allowlist of hosts/paths (OWASP open redirect guidance).
- `claimed_id` verification: Ensure the `openid.claimed_id` host is exactly `steamcommunity.com` and the path begins with `/openid/id/`; extract the trailing 64-bit SteamID. Reject nonconforming values.
- Host/proxy hygiene: Document `trust proxy` requirements and prefer constructing absolute URLs from a configured origin to avoid host header poisoning.

4) Packaging/build/tooling
- Build with `tsup` to emit dual ESM/CJS with type declarations and source maps; `exports` map in `package.json`; `engines: { node: ">=20" }`.
- Lint with ESLint flat config + `@typescript-eslint`; format with Prettier. Test with Vitest + `@vitest/coverage-v8` to target ≥90% coverage. Generate docs with TypeDoc. Automate versioning/publish with Changesets and GitHub Actions (Node 20/22 matrix).

## Alternatives considered

OpenID 2.0 libraries
- `openid` (Node RP lib): simplifies flow but adds a substantial dependency surface and brings its own API/assumptions; not necessary for the limited Steam OP surface. Minimal in-house RP logic is feasible and clearer to audit.
- `openid-client`: modern but for OpenID Connect (OIDC), not OpenID 2.0; not applicable.

Passport integration approaches
- Hand-rolled base without `passport-strategy`: possible, but risks subtle incompatibilities with Passport middleware expectations. `passport-strategy` is tiny and battle-tested, so we include it to reduce integration risk.

HTTP client
- Using `node-fetch` or axios: unnecessary in Node 20/22 because global `fetch` (Undici) is built-in and sufficient, reducing deps and transitive risk.

## Consequences

- Security is centered on spec-compliant verification and layered defenses. Most complexity is in careful validation of inputs, nonce storage, and strict redirect/host handling.
- Minimal runtime deps (only `passport-strategy`) reduce attack surface and maintenance.
- The library stays compatible with both ESM and CJS consumers and modern CI/release flows.

## Implementation notes (succinct)

- Authorization redirect: construct `https://steamcommunity.com/openid/login` with required params: `openid.ns`, `openid.mode=checkid_setup`, `openid.realm`, `openid.return_to`, `openid.claimed_id=identifier_select`, `openid.identity=identifier_select` (per spec and Steam docs).
- Callback verification: validate presence and types of OpenID fields; POST all received fields plus `openid.mode=check_authentication` to Steam; require `is_valid:true` response; then enforce `return_to`, `realm`, nonce freshness/uniqueness, and claimed_id host/path before succeeding.

## Citations

- OpenID 2.0 spec (sections 11, 11.1.2, 11.3, 11.4, 13.2, 15): https://openid.net/specs/openid-authentication-2_0.html
- Steamworks “User Authentication and Ownership” (OpenID): https://partner.steamgames.com/doc/features/auth#openid
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Unvalidated Redirects Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
- Node.js global fetch: https://nodejs.org/api/globals.html#fetch
- ESLint flat config overview: https://eslint.org/docs/latest/use/configure
- tsup docs: https://tsup.egoist.dev/
- Vitest docs: https://vitest.dev/
- TypeDoc: https://typedoc.org/
- Changesets CLI: https://www.npmjs.com/package/@changesets/cli
