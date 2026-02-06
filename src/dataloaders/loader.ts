/**
 * DataLoader implementation for N+1 prevention
 * Simple batching pattern - production: use 'dataloader' npm package
 */

import type { DataLoader } from '../lib/types.js';

/**
 * Create a simple batching data loader
 */
export function createDataLoader<K, V>(
  batchFn: (keys: K[]) => Promise<(V | Error)[]>
): DataLoader<K, V> {
  const cache = new Map<string, Promise<V>>();
  let batch: { key: K; resolve: (v: V) => void; reject: (e: Error) => void }[] = [];
  let scheduled = false;

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(async () => {
      scheduled = false;
      const currentBatch = batch;
      batch = [];

      const keys = currentBatch.map((item) => item.key);
      try {
        const results = await batchFn(keys);
        for (let i = 0; i < currentBatch.length; i++) {
          const result = results[i];
          if (result instanceof Error) {
            currentBatch[i]!.reject(result);
          } else {
            currentBatch[i]!.resolve(result as V);
          }
        }
      } catch (error) {
        for (const item of currentBatch) {
          item.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });
  }

  return {
    load(key: K): Promise<V> {
      const cacheKey = JSON.stringify(key);
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const promise = new Promise<V>((resolve, reject) => {
        batch.push({ key, resolve, reject });
        schedule();
      });

      cache.set(cacheKey, promise);
      return promise;
    },

    async loadMany(keys: K[]): Promise<(V | Error)[]> {
      return Promise.all(
        keys.map((key) =>
          this.load(key).catch((error: unknown) =>
            error instanceof Error ? error : new Error(String(error))
          )
        )
      );
    },

    clear(key: K): void {
      cache.delete(JSON.stringify(key));
    },

    clearAll(): void {
      cache.clear();
    },
  };
}
