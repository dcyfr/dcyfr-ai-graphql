/**
 * Simple JWT utilities
 * Production: Use jsonwebtoken or jose
 */

import type { AuthUser } from '../types.js';

/**
 * Simple token encoding (demo only - use proper JWT in production)
 * In production, use `jsonwebtoken` or `jose` library
 */
export function createToken(user: AuthUser, _secret: string, _expiresIn: string): string {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    iat: Date.now(),
  };
  // Simple base64 encoding for demo - NOT SECURE for production
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decode and verify token
 */
export function verifyToken(token: string, _secret: string): AuthUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Simple password hashing (demo only - use bcrypt/argon2 in production)
 */
export function hashPassword(password: string): string {
  return `hashed_${Buffer.from(password).toString('base64').slice(0, 20)}`;
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
