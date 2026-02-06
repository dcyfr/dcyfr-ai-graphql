/**
 * Auth resolver tests
 */

import { describe, it, expect } from 'vitest';
import { executeQuery } from '../../helpers/test-utils.js';

describe('Auth Resolvers', () => {
  describe('Mutation.register', () => {
    it('should register a new user', async () => {
      const result = await executeQuery(`
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
            user {
              id
              name
              email
              role
            }
          }
        }
      `, {
        input: {
          email: 'newuser@example.com',
          name: 'New User',
          password: 'securePassword123',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.register.token).toBeDefined();
      expect(result.data?.register.token.length).toBeGreaterThan(0);
      expect(result.data?.register.user.email).toBe('newuser@example.com');
      expect(result.data?.register.user.role).toBe('USER');
    });

    it('should reject duplicate email registration', async () => {
      // Register first
      await executeQuery(`
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'duplicate@example.com',
          name: 'First User',
          password: 'password12345',
        },
      });

      // Try to register again with same email
      const result = await executeQuery(`
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'duplicate@example.com',
          name: 'Second User',
          password: 'password12345',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Email already registered');
    });

    it('should reject short password', async () => {
      const result = await executeQuery(`
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'short@example.com',
          name: 'Short Password',
          password: '123',
        },
      });

      expect(result.errors).toBeDefined();
    });
  });

  describe('Mutation.login', () => {
    it('should login with valid credentials', async () => {
      // Register first
      await executeQuery(`
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'logintest@example.com',
          name: 'Login Test',
          password: 'testPassword123',
        },
      });

      // Login
      const result = await executeQuery(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user {
              email
              name
            }
          }
        }
      `, {
        input: {
          email: 'logintest@example.com',
          password: 'testPassword123',
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.login.token).toBeDefined();
      expect(result.data?.login.user.email).toBe('logintest@example.com');
    });

    it('should reject invalid email', async () => {
      const result = await executeQuery(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Invalid credentials');
    });

    it('should reject wrong password', async () => {
      // Register first
      await executeQuery(`
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'wrongpass@example.com',
          name: 'Wrong Pass',
          password: 'correctPassword1',
        },
      });

      const result = await executeQuery(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
          }
        }
      `, {
        input: {
          email: 'wrongpass@example.com',
          password: 'wrongPassword1!!',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Invalid credentials');
    });
  });
});
