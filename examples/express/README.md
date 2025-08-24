# Example Express app

Secure minimal app showing Passport + SteamStrategy wiring.

Prereqs
- Node 20+

Setup
1. From repo root, build the library so the example can import dist output.
2. Copy `.env.example` to `.env` and set `APP_ORIGIN` and `SESSION_SECRET` (and `STEAM_API_KEY` if you want profile info).

Run
1. Install example deps: `npm install` inside this folder.
2. Start: `npm run dev`
3. Visit `http://localhost:3000/auth/steam` to start login.

Security notes
- In production, run behind HTTPS, set a strong session secret, and configure trust proxy according to your platform.
- This demo uses in-memory state/nonce stores; switch to durable stores in real deployments.
