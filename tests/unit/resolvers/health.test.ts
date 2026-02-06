/**
 * Health check query test
 */

import { describe, it, expect } from 'vitest';
import { executeQuery } from '../../helpers/test-utils.js';

describe('Health Check', () => {
  it('should return health status', async () => {
    const result = await executeQuery(`
      query Health {
        health {
          status
          timestamp
          version
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    expect(result.data?.health.status).toBe('ok');
    expect(result.data?.health.version).toBe('1.0.0');
    expect(result.data?.health.timestamp).toBeDefined();
  });
});
