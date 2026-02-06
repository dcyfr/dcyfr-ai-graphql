/**
 * Utility tests - pagination, auth helpers, validation
 */

import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, buildConnection } from '../../../src/lib/utils/pagination.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from '../../../src/lib/utils/auth.js';
import { validateInput, createUserSchema, createPostSchema, loginSchema } from '../../../src/lib/schemas/validation.js';
import { UserRole } from '../../../src/lib/types.js';
import type { AuthUser } from '../../../src/lib/types.js';

describe('Pagination Utilities', () => {
  it('should encode and decode cursors', () => {
    const id = 'test-id-123';
    const cursor = encodeCursor(id);
    expect(cursor).toBeTruthy();
    expect(decodeCursor(cursor)).toBe(id);
  });

  it('should build connection from items', () => {
    const items = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];

    const connection = buildConnection(items, true, 10);

    expect(connection.edges.length).toBe(3);
    expect(connection.edges[0]!.node.id).toBe('1');
    expect(connection.edges[0]!.cursor).toBeTruthy();
    expect(connection.pageInfo.hasNextPage).toBe(true);
    expect(connection.pageInfo.startCursor).toBeDefined();
    expect(connection.pageInfo.endCursor).toBeDefined();
    expect(connection.totalCount).toBe(10);
  });

  it('should handle empty items', () => {
    const connection = buildConnection([], false, 0);
    expect(connection.edges.length).toBe(0);
    expect(connection.pageInfo.hasNextPage).toBe(false);
    expect(connection.totalCount).toBe(0);
  });
});

describe('Auth Utilities', () => {
  it('should hash passwords deterministically', () => {
    const hash1 = hashPassword('mypassword');
    const hash2 = hashPassword('mypassword');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different passwords', () => {
    const hash1 = hashPassword('password1');
    const hash2 = hashPassword('password2');
    expect(hash1).not.toBe(hash2);
  });

  it('should verify correct passwords', () => {
    const hash = hashPassword('correctpassword');
    expect(verifyPassword('correctpassword', hash)).toBe(true);
  });

  it('should reject incorrect passwords', () => {
    const hash = hashPassword('correctpassword');
    expect(verifyPassword('wrongpassword', hash)).toBe(false);
  });

  it('should create and verify tokens', () => {
    const user: AuthUser = {
      id: 'user-1',
      email: 'token@test.com',
      name: 'Token Test',
      role: UserRole.USER,
    };

    const token = createToken(user, 'secret', '1h');
    expect(token).toBeTruthy();

    const decoded = verifyToken(token, 'secret');
    expect(decoded).toBeDefined();
    expect(decoded?.id).toBe('user-1');
    expect(decoded?.email).toBe('token@test.com');
    expect(decoded?.role).toBe('USER');
  });

  it('should return null for invalid tokens', () => {
    const result = verifyToken('invalid-token', 'secret');
    expect(result).toBeNull();
  });
});

describe('Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate valid user input', () => {
      const result = validateInput(createUserSchema, {
        email: 'valid@email.com',
        name: 'Valid Name',
        password: 'securepassword',
      });
      expect(result.email).toBe('valid@email.com');
    });

    it('should reject invalid email', () => {
      expect(() =>
        validateInput(createUserSchema, {
          email: 'not-an-email',
          name: 'Test',
          password: 'securepassword',
        })
      ).toThrow('Validation failed');
    });

    it('should reject short password', () => {
      expect(() =>
        validateInput(createUserSchema, {
          email: 'test@test.com',
          name: 'Test',
          password: '123',
        })
      ).toThrow('Validation failed');
    });

    it('should reject empty name', () => {
      expect(() =>
        validateInput(createUserSchema, {
          email: 'test@test.com',
          name: '',
          password: 'securepassword',
        })
      ).toThrow('Validation failed');
    });
  });

  describe('createPostSchema', () => {
    it('should validate valid post input', () => {
      const result = validateInput(createPostSchema, {
        title: 'My Post',
        content: 'Some content here',
        tags: ['test'],
      });
      expect(result.title).toBe('My Post');
    });

    it('should reject empty title', () => {
      expect(() =>
        validateInput(createPostSchema, {
          title: '',
          content: 'Content',
        })
      ).toThrow('Validation failed');
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login input', () => {
      const result = validateInput(loginSchema, {
        email: 'user@test.com',
        password: 'password',
      });
      expect(result.email).toBe('user@test.com');
    });

    it('should reject invalid email', () => {
      expect(() =>
        validateInput(loginSchema, {
          email: 'bad-email',
          password: 'password',
        })
      ).toThrow('Validation failed');
    });
  });
});
