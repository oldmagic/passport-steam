import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import passport from 'passport';
import { SteamStrategy } from '../../dist/index.cjs';
import rateLimit from 'express-rate-limit';

const app = express();
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
const API_KEY = process.env.STEAM_API_KEY;

// Security headers
app.use(helmet());

// Behind a reverse proxy (e.g., on Render/Heroku/Nginx), enable trust proxy
app.set('trust proxy', 1);

// Sessions (secure defaults; adjust in production)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-insecure',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: ORIGIN.startsWith('https:'),
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new SteamStrategy({
  realm: ORIGIN + '/',
  returnURL: ORIGIN + '/auth/steam/return',
  allowedReturnHosts: [new URL(ORIGIN).host],
  apiKey: API_KEY,
  // Simple ephemeral stores for demo only
  state: {
    generate: () => Math.random().toString(36).slice(2),
    store: new (class { m = new Map(); set(k,v){this.m.set(k,v);} get(k){return this.m.get(k);} delete(k){this.m.delete(k);} })(),
  },
  nonceStore: new (class { s = new Set(); putOnce(n){ if(this.s.has(n)) return false; this.s.add(n); return true; } })(),
}, (profile, done) => {
  // Map to your user record; demo returns profile
  done(null, { id: profile.id, name: profile.displayName, photos: profile.photos });
}));

// Rate limiter: apply only to sensitive/expensive endpoints
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 requests per windowMs per IP
  message: 'Too many authentication attempts. Please try again later.',
});

// Routes
app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return', authRateLimiter, (req, res, next) => {
  passport.authenticate('steam', (err, user) => {
    if (err) return next(err);
    if (!user) return res.status(401).send('Unauthorized');
    // Regenerate session on login (session fixation defense)
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.redirect('/me');
      });
    });
  })(req, res, next);
});

app.get('/me', (req, res) => {
  res.json({ authenticated: !!req.user, user: req.user || null });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Example app on ${ORIGIN} (port ${port})`);
});
