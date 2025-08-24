import { describe, it, expect } from 'vitest';
import * as pkg from '../src/index.js';

describe('package exports', () => {
  it('exports SteamStrategy and types', () => {
    expect(pkg).toHaveProperty('SteamStrategy');
  });
});
