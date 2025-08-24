import type { StateStore } from './utils/state.js';
import type { NonceStore } from './utils/nonce.js';
export interface SteamProfile {
  id: string; // SteamID64
  displayName?: string;
  photos?: Array<{ value: string }>;
}

export interface StrategyOptions {
  realm: string; // e.g., https://example.com/
  returnURL: string; // absolute callback URL
  allowedReturnHosts?: string[]; // strict allowlist
  apiKey?: string; // optional Steam Web API key for profile fetch
  state?: {
    generate?: () => Promise<string> | string;
    store?: StateStore;
  };
  nonceStore?: NonceStore;
}
