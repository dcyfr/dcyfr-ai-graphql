/**
 * Environment configuration
 */

import type { ServerConfig } from '../lib/types.js';

export function loadConfig(): ServerConfig {
  return {
    port: parseInt(process.env['PORT'] ?? '4000', 10),
    cors: {
      origin: process.env['CORS_ORIGIN'] ?? '*',
      credentials: true,
    },
    auth: {
      jwtSecret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
      jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
    },
    rateLimit: {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '60000', 10),
      maxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] ?? '100', 10),
    },
  };
}
