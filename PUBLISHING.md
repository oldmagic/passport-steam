# Publishing guide

This project uses Changesets for versioning and release PRs. GitHub Actions automates publishing to npm.

## Prerequisites
- npm account with 2FA (recommended: auth-only)
- Add NPM_TOKEN secret in the repo (automation token)
- Ensure package.json has correct name, version, and `access: public` via Changesets config

## Release flow
1. Create a changeset locally:
   - npx changeset
   - Choose packages and version bump type, write a summary.
2. Commit and push. The Release workflow opens or updates a "Version Packages" PR.
3. Merge the PR. The workflow publishes to npm with provenance and tags the release.

## Manual publish (optional)
```bash
npm ci
npm run build
npm publish --provenance --access public
```

## Verify after publish
- npm info passport-steam-modern version
- Install in a sample app and import the ESM/CJS entry.

## Notes
- CI runs lint, typecheck, build, and tests before publishing.
- Docs can be generated with `npm run docs` (output in docs/api).
