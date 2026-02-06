/**
 * Authentication middleware
 * Extracts user from Authorization header
 */

import { verifyToken } from '../lib/utils/auth.js';
import type { AuthUser, ServerConfig } from '../lib/types.js';

/**
 * Extract authenticated user from request headers
 */
export function extractUser(
  headers: { authorization?: string } | undefined,
  config: ServerConfig
): AuthUser | null {
  if (!headers?.authorization) return null;

  const parts = headers.authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  const token = parts[1]!;
  return verifyToken(token, config.auth.jwtSecret);
}

/**
 * Require authentication - throws if no user
 */
export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Require admin role
 */
export function requireAdmin(user: AuthUser | null): AuthUser {
  const authed = requireAuth(user);
  if (authed.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  return authed;
}
