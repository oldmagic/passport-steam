export interface NonceStore {
  /** Return true if stored successfully (i.e., not previously seen). */
  putOnce(nonce: string, ttlMs: number): Promise<boolean> | boolean;
}

export async function storeNonceOnce(store: NonceStore, nonce: string, ttlMs: number): Promise<boolean> {
  return Promise.resolve(store.putOnce(nonce, ttlMs));
}
