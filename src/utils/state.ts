import { randomBytes, timingSafeEqual } from 'node:crypto';

export interface StateStore {
  set(key: string, value: string, ttlMs: number): Promise<void> | void;
  get(key: string): Promise<string | undefined> | string | undefined;
  delete(key: string): Promise<void> | void;
}

export function generateState(bytes = 16): string {
  return randomBytes(bytes).toString('hex');
}

export async function verifyAndConsumeState(
  store: StateStore,
  key: string,
  expected: string
): Promise<boolean> {
  const actual = await Promise.resolve(store.get(key));
  if (!actual) return false;
  const ok = safeEqual(actual, expected);
  await Promise.resolve(store.delete(key));
  return ok;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
