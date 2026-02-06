/**
 * Middleware tests
 */

import { describe, it, expect } from 'vitest';
import { extractUser, requireAuth, requireAdmin } from '../../../src/middleware/auth.js';
import { RateLimiter } from '../../../src/middleware/rate-limit.js';
import { loadConfig } from '../../../src/config/env.js';
import { createToken } from '../../../src/lib/utils/auth.js';
import { UserRole } from '../../../src/lib/types.js';
import type { AuthUser } from '../../../src/lib/types.js';

describe('Auth Middleware', () => {
  const config = loadConfig();

  const testUser: AuthUser = {
    id: 'test-1',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
  };

  describe('extractUser', () => {
    it('should extract user from valid bearer token', () => {
      const token = createToken(testUser, config.auth.jwtSecret, '1h');
      const user = extractUser({ authorization: `Bearer ${token}` }, config);
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for missing authorization', () => {
      const user = extractUser(undefined, config);
      expect(user).toBeNull();
    });

    it('should return null for invalid token format', () => {
      const user = extractUser({ authorization: 'InvalidHeader' }, config);
      expect(user).toBeNull();
    });

    it('should return null for missing bearer keyword', () => {
      const user = extractUser({ authorization: 'Token abc123' }, config);
      expect(user).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', () => {
      const result = requireAuth(testUser);
      expect(result).toEqual(testUser);
    });

    it('should throw when not authenticated', () => {
      expect(() => requireAuth(null)).toThrow('Authentication required');
    });
  });

  describe('requireAdmin', () => {
    it('should return user when admin', () => {
      const admin: AuthUser = { ...testUser, role: UserRole.ADMIN };
      const result = requireAdmin(admin);
      expect(result.role).toBe('ADMIN');
    });

    it('should throw when not admin', () => {
      expect(() => requireAdmin(testUser)).toThrow('Admin access required');
    });

    it('should throw when not authenticated', () => {
      expect(() => requireAdmin(null)).toThrow('Authentication required');
    });
  });
});

describe('Rate Limiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('test-ip')).toBe(true);
    }
  });

  it('should block requests over limit', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 3 });
    limiter.check('test-ip');
    limiter.check('test-ip');
    limiter.check('test-ip');
    expect(limiter.check('test-ip')).toBe(false);
  });

  it('should track different keys separately', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1 });
    expect(limiter.check('ip-1')).toBe(true);
    expect(limiter.check('ip-2')).toBe(true);
    expect(limiter.check('ip-1')).toBe(false);
    expect(limiter.check('ip-2')).toBe(false);
  });

  it('should report remaining requests', () => {
    const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 5 });
    expect(limiter.remaining('fresh-ip')).toBe(5);
    limiter.check('fresh-ip');
    expect(limiter.remaining('fresh-ip')).toBe(4);
  });

  it('should cleanup expired entries', () => {
    const limiter = new RateLimiter({ windowMs: 1, maxRequests: 1 });
    limiter.check('expired-ip');

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        limiter.cleanup();
        // After cleanup and window expiry, should allow again
        expect(limiter.check('expired-ip')).toBe(true);
        resolve();
      }, 10);
    });
  });
});
