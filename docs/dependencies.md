# Dependencies and rationale (as of 2025-08-24)

Runtime (prod)
- passport-strategy — Tiny base class used by Passport strategies. Ensures compatibility with Passport’s expected interface without pulling full Passport in. Alternatives: implement the base contract manually (risk of edge-case incompatibilities). Source: https://www.npmjs.com/package/passport-strategy

Peer dependencies
- passport — Consumers bring their own Passport. We test compatibility but do not require it at runtime for library core. Source: https://www.npmjs.com/package/passport

Dev-only (build, lint, test, docs, release)
- typescript 5.x — TS compiler, strict mode. Source: https://www.npmjs.com/package/typescript
- tsup 8.x — Bundle to dual ESM/CJS + d.ts + source maps. Source: https://www.npmjs.com/package/tsup
- eslint 9.x — Flat config linting. Source: https://www.npmjs.com/package/eslint
- @typescript-eslint/parser, @typescript-eslint/eslint-plugin 8.x — TS linting. Source: https://www.npmjs.com/package/@typescript-eslint/eslint-plugin
- prettier 3.x — Formatting. Source: https://www.npmjs.com/package/prettier
- vitest 3.x, @vitest/coverage-v8 3.x — Testing and coverage. Source: https://www.npmjs.com/package/vitest
- typedoc 0.28.x — API docs generation. Source: https://www.npmjs.com/package/typedoc
- @types/node 24.x — Node types for dev/test. Source: https://www.npmjs.com/package/@types/node
- @types/passport — Types for integration examples/tests. Source: https://www.npmjs.com/package/@types/passport
- @changesets/cli 2.x — Versioning and release automation. Source: https://www.npmjs.com/package/@changesets/cli

Not included (by design)
- openid / openid-client — We implement minimal OpenID 2.0 RP logic per spec using global fetch; `openid-client` targets OIDC (not applicable). Keeping deps small reduces supply-chain risk.
- node-fetch/axios — Node 20+ provides global `fetch` (Undici), sufficient here.
- qs/querystring — Use Web URL/URLSearchParams and built-in WHATWG parsing.

Pinned versions (examples for Prompt 2)
- typescript: 5.9.x
- tsup: 8.5.x
- eslint: 9.34.x
- @typescript-eslint/*: 8.40.x
- prettier: 3.6.x
- vitest: 3.2.x, @vitest/coverage-v8: 3.2.x
- typedoc: 0.28.10
- @types/node: 24.3.x
- @types/passport: 1.0.17
- @changesets/cli: 2.29.x

Citations
- TypeScript: https://www.npmjs.com/package/typescript
- tsup: https://www.npmjs.com/package/tsup
- ESLint: https://www.npmjs.com/package/eslint
- @typescript-eslint parser/plugin: https://www.npmjs.com/package/@typescript-eslint/eslint-plugin
- Prettier: https://www.npmjs.com/package/prettier
- Vitest: https://www.npmjs.com/package/vitest
- @vitest/coverage-v8: https://www.npmjs.com/package/@vitest/coverage-v8
- TypeDoc: https://www.npmjs.com/package/typedoc
- @types/node: https://www.npmjs.com/package/@types/node
- @types/passport: https://www.npmjs.com/package/@types/passport
- @changesets/cli: https://www.npmjs.com/package/@changesets/cli
- passport: https://www.npmjs.com/package/passport
- passport-strategy: https://www.npmjs.com/package/passport-strategy