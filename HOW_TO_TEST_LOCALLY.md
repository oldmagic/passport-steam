# How to test locally

## Prereqs
- Node 20+ (22 recommended)
- npm 10+

## Install
```bash
npm install
```

## Lint, typecheck, build, test
```bash
npm run lint
npm run typecheck
npm run build
npm run coverage
```

## Run the example app
```bash
# Build the library first so examples use dist/
npm run build

# Move into the example
cd examples/express

# Install example deps
npm install

# Configure environment
cp .env.example .env
# Edit .env to set SESSION_SECRET and optionally STEAM_API_KEY

# Start the example
npm start
```

Visit http://localhost:3000 then `/auth/steam`.

## Publish a canary (dry-run)
```bash
# Create a changeset
npx changeset

# Build
npm run build

# Publish (requires NPM_TOKEN if via CI)
npm publish --provenance --access public --dry-run
```

## Consumer snippet

ESM:
```ts
import passport from 'passport';
import { SteamStrategy } from 'passport-steam-modern';

passport.use(new SteamStrategy({
  realm: 'https://example.com/',
  returnURL: 'https://example.com/auth/steam/return',
  allowedReturnHosts: ['example.com'],
}, (profile, done) => done(null, { id: profile.id })));
```

CommonJS:
```js
const passport = require('passport');
const { SteamStrategy } = require('passport-steam-modern');

passport.use(new SteamStrategy({
  realm: 'https://example.com/',
  returnURL: 'https://example.com/auth/steam/return',
  allowedReturnHosts: ['example.com'],
}, (profile, done) => done(null, { id: profile.id })));
```
