PROJECT: Modern TypeScript Passport Strategy for Steam (OpenID 2.0)
MODE: Step-by-step prompts (recommended)
LAST UPDATED: Set {{DATE}} below before running

HOW TO USE
- Replace placeholders like {{DATE}}, {{ORG}}, {{PKG_NAME}} in this file.
- Ask the AI to execute Prompts 1 → 10 in order, producing all requested
  artifacts. Each prompt is self-contained and references prior outputs.
- The AI must perform fresh web research as of {{DATE}} and cite sources.
- Output should include code blocks, repo tree, and clear instructions.
- Do not copy code from the reference repos; they are for inspiration only.

VARIABLES (EDIT THESE)
- {{DATE}}: 2025-08-24
- {{ORG}}: your-org
- {{PKG_NAME}}: passport-steam-modern (example; pick your final name)

REFERENCE REPOS (READ ONLY, DO NOT COPY)
- https://github.com/easton36/modern-passport-steam
- https://github.com/liamcurry/passport-steam
- https://github.com/DoctorMcKay/node-steam-signin

================================================================================
Prompt 1 — Research and decisions (dependencies, specs, security)
================================================================================
You are a senior Node/TypeScript library engineer. Task: Decide on the
architecture and dependencies for a modern Passport Steam strategy npm package.

Inputs
- Refs to review (do not copy):
  - https://github.com/easton36/modern-passport-steam
  - https://github.com/liamcurry/passport-steam
  - https://github.com/DoctorMcKay/node-steam-signin
- Target: Node 20/22+, TS strict, ESM+CJS output, minimal deps.
- Steam uses OpenID 2.0 endpoint: steamcommunity.com/openid/login

Do
- As of {{DATE}}, research and compare:
  - Viability of implementing a minimal OpenID 2.0 relying party using global
    fetch vs using a maintained library. Identify maintained OpenID 2.0 libs
    (if any). If none suitable, justify a small internal implementation.
  - Current status of Passport core and type packages; ESM/CJS compatibility.
  - Best practices for: CSRF/state with OpenID 2.0, return_to/realm validation,
    nonce, replay prevention, open redirect defense, strict host allowlist.
  - Package scaffolding tools (tsup, tsx, vitest), linting (ESLint flat),
    docs (typedoc), release (changesets).
- Output:
  - ADR (Architecture Decision Record) summarizing decisions with pros/cons and
    the chosen path.
  - Final dependency list with reasons and alternatives.
  - Security checklist specific to Steam OpenID 2.0.
  - Citations with links for everything.

Constraints
- Prefer zero/low deps. Node’s global fetch is allowed.
- No copying from refs; design an original interface mindful of common
  Passport usage.

================================================================================
Prompt 2 — Project scaffolding and configuration
================================================================================
Create a new TypeScript npm package {{PKG_NAME}} implementing decisions from
Prompt 1.

Requirements
- package.json:
  - type: module
  - Exports map for ESM and CJS with types
  - sideEffects: false
  - engines: { "node": ">=20" }
  - Scripts: build, dev, lint, test, coverage, typecheck, docs, release
  - Dependencies: only those justified; pin latest safe versions as of {{DATE}}
- Configs: tsconfig (strict), ESLint flat config, Prettier, tsup config
  (dual ESM+CJS), Vitest config, Typedoc, Changesets
- Repo structure:
  - src/, tests/, examples/express/, .github/workflows/ci.yml, .changeset/
- Provide all files with contents.

Output
- Print the repo tree first.
- Then print each file in its own code block.
- Include a short note justifying version selections with citations.

================================================================================
Prompt 3 — Core implementation: SteamStrategy
================================================================================
Implement the Passport strategy for Steam.

Do
- Create src/SteamStrategy.ts implementing PassportStrategy contract.
- Named exports: SteamStrategy, SteamProfile, StrategyOptions.
- Implement OpenID 2.0 flow:
  - Authenticate: construct redirect to
    https://steamcommunity.com/openid/login with correct parameters:
    - openid.ns
    - openid.mode=checkid_setup
    - openid.realm
    - openid.return_to
    - openid.claimed_id=
      "http://specs.openid.net/auth/2.0/identifier_select"
    - openid.identity=
      "http://specs.openid.net/auth/2.0/identifier_select"
  - Callback:
    - Strictly validate incoming query.
    - POST with openid.mode=check_authentication to Steam.
    - Verify "is_valid:true".
    - Verify claimed_id host and extract SteamID64.
    - Enforce allowedReturnHosts.
    - Check nonce/state to prevent CSRF and replay.
    - Guard against open redirects.
- Provide robust error classes and helpful messages.
- Optional profile fetch if apiKey provided (Steam Web API). Use modern fetch,
  graceful error handling, and note rate limits. Keep optional and isolated.
- Clean types and JSDoc. No default export.

Output
- Full source for:
  - src/SteamStrategy.ts
  - src/types.ts
  - src/utils/* (helpers for URL building, validation, nonce/state)
  - index.ts

================================================================================
Prompt 4 — Tests (Vitest) and coverage
================================================================================
Write comprehensive tests.

Do
- Unit test utilities: URL builders, validators, host allowlist, nonce/state.
- Strategy tests:
  - Initiation: verify redirect URL and parameters.
  - Callback success: mock fetch to Steam returning "is_valid:true".
  - Failure paths: invalid signature, mismatched realm/return_to, bad
    claimed_id host, missing params, replayed nonce/state, open redirect
    attempts, disallowed return host.
  - Optional profile fetch: mock WebAPI responses and error handling.
- Use Vitest with mocked fetch (e.g., undici mock or msw).
- Aim for ≥90% coverage.

Output
- tests/ files with full code; any test helpers; coverage config and a brief
  coverage summary.
- Update scripts if needed.

================================================================================
Prompt 5 — Example Express app with Passport wiring
================================================================================
Provide a minimal, secure example app.

Do
- Express app with express-session configured securely:
  - cookie flags (secure, httpOnly, sameSite)
  - trust proxy guidance
- Passport initialization and SteamStrategy registration.
- Routes: GET /auth/steam, GET /auth/steam/return, GET /me.
- Demonstrate passing allowedReturnHosts and realm; handle session regeneration
  on login.
- Use .env for secrets/apikey and note production hardening.

Output
- examples/express/* files with code and a README explaining setup and running.

================================================================================
Prompt 6 — Documentation (README) and API reference
================================================================================
Write a production-quality README.

Do
- Clear description and goals; how this differs from older packages.
- Installation, engines, quick start, options reference, return types.
- Advanced topics:
  - Security hardening (state/nonce, return_to allowlist)
  - Proxies and HTTPS
  - Fetching Steam profile (optional) and quotas
  - TypeScript tips
  - Migration from passport-steam / node-steam-signin
- Troubleshooting FAQ with common errors.
- Badges (CI, npm version, license).
- Link to examples and Typedoc API docs.

Output
- README.md
- typedoc.json (or config) and an API.md index if applicable.

================================================================================
Prompt 7 — CI/CD and release
================================================================================
Set up automation.

Do
- GitHub Actions:
  - On push/pull_request: lint, typecheck, test matrix (Node 20, 22)
  - On release (Changesets workflow): publish to npm (with provenance if
    supported) and build docs
- Changesets setup for versioning.
- Provide release script and instructions.

Output
- .github/workflows/*.yml
- .changeset/config.json
- PUBLISHING.md with a step-by-step guide and checklist.

================================================================================
Prompt 8 — Security review and threat model
================================================================================
Perform a focused security pass.

Do
- Threat model the OpenID flow. Enumerate risks:
  - CSRF
  - Open redirect
  - Replay attacks
  - Host header poisoning
  - claimed_id spoofing
  - realm/return_to mismatch
  - Session fixation
  - Cookie issues
- Show how the implementation mitigates each (with code pointers).
- Provide a security checklist for integrators.

Output
- SECURITY.md with findings, mitigations, and integration checklist.
- Include citations for best practices.

================================================================================
Prompt 9 — Quality pass and DX polish
================================================================================
Do
- DX assessment: error messages, JSDoc completeness, exported types,
  tree-shakeability.
- package.json fields: funding, exports, types, files, sideEffects.
- Confirm ESM+CJS interop and Passport compatibility (CommonJS require and ESM
  import examples).
- Produce a short CHANGELOG entry for v1.0.0.

Output
- List of adjustments and any updated files.
- CHANGELOG.md with v1.0.0 entry.

================================================================================
Prompt 10 — Local test and publish guide
================================================================================
Provide final instructions.

Do
- Exact commands to install, build, test, run example, and publish.
- npm provenance and 2FA notes; verification steps after publish.
- Minimal consumer snippet (ESM and CJS) to validate package works.

Output
- HOW_TO_TEST_LOCALLY.md
- Consumer snippet shown inline.

================================================================================
Global rules for all prompts
================================================================================
- ALWAYS conduct fresh web research as of {{DATE}} for each dependency, API,
  and spec used. Verify deprecations, breaking changes, and security notes.
- Cite sources with links near the relevant decisions and again in the ADR and
  README.
- Prefer zero-dependency where reasonable; otherwise pick actively maintained
  deps with clear release cadence and security posture.
- Target Node 20/22. Use Node’s global fetch. Avoid unmaintained OpenID libs;
  implement minimal OpenID 2.0 RP logic internally if no suitable modern lib.
- Produce dual ESM+CJS builds, strict TS, ESLint (flat) + Prettier, Vitest,
  tsup, Changesets, Typedoc, GitHub Actions CI.
- Security must include: strict return_to vs realm validation, open redirect
  protection, claimed_id host verification, nonce/state CSRF protection and
  replay prevention, robust query param validation, session hardening in the
  example app.
- No default exports; named exports only. Tree-shakeable. Keep runtime peer
  deps minimal (ideally only passport).
- Do not copy code from references; write original implementations.
tsup, Changesets, GitHub Actions CI, Typedoc.

Now, do the work end-to-end.