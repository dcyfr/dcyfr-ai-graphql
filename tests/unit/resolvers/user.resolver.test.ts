/**
 * User resolver tests
 */

import { describe, it, expect } from 'vitest';
import { executeQuery, testUsers } from '../../helpers/test-utils.js';

describe('User Resolvers', () => {
  describe('Query.user', () => {
    it('should fetch a user by id', async () => {
      const result = await executeQuery(`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
            role
          }
        }
      `, { id: testUsers.alice.id });

      expect(result.errors).toBeUndefined();
      expect(result.data?.user).toMatchObject({
        id: testUsers.alice.id,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'USER',
      });
    });

    it('should return null for non-existent user', async () => {
      const result = await executeQuery(`
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
          }
        }
      `, { id: 'non-existent-id' });

      expect(result.errors).toBeUndefined();
      expect(result.data?.user).toBeNull();
    });
  });

  describe('Query.users', () => {
    it('should list users with pagination', async () => {
      const result = await executeQuery(`
        query ListUsers {
          users(first: 10) {
            edges {
              node {
                id
                name
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
            totalCount
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      expect(result.data?.users.edges.length).toBeGreaterThan(0);
      expect(result.data?.users.totalCount).toBeGreaterThan(0);
    });
  });

  describe('Query.me', () => {
    it('should return current user when authenticated', async () => {
      const result = await executeQuery(`
        query Me {
          me {
            id
            name
            email
          }
        }
      `, {}, testUsers.alice);

      expect(result.errors).toBeUndefined();
      expect(result.data?.me).toMatchObject({
        id: testUsers.alice.id,
        name: 'Alice Johnson',
      });
    });

    it('should error when not authenticated', async () => {
      const result = await executeQuery(`
        query Me {
          me {
            id
          }
        }
      `);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Authentication required');
    });
  });

  describe('Mutation.updateUser', () => {
    it('should update own profile', async () => {
      const result = await executeQuery(`
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            bio
          }
        }
      `, {
        id: testUsers.alice.id,
        input: { bio: 'Updated bio' },
      }, testUsers.alice);

      expect(result.errors).toBeUndefined();
      expect(result.data?.updateUser.bio).toBe('Updated bio');
    });

    it('should reject updating other users profile', async () => {
      const result = await executeQuery(`
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
          }
        }
      `, {
        id: testUsers.alice.id,
        input: { bio: 'Hacker attempt' },
      }, testUsers.bob);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Not authorized');
    });

    it('should allow admin to update any user', async () => {
      const result = await executeQuery(`
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            bio
          }
        }
      `, {
        id: testUsers.bob.id,
        input: { bio: 'Admin updated' },
      }, testUsers.admin);

      expect(result.errors).toBeUndefined();
    });
  });

  describe('Mutation.deleteUser', () => {
    it('should reject non-admin delete', async () => {
      const result = await executeQuery(`
        mutation DeleteUser($id: ID!) {
          deleteUser(id: $id)
        }
      `, { id: testUsers.bob.id }, testUsers.alice);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Admin access required');
    });
  });

  describe('User.posts', () => {
    it('should resolve user posts', async () => {
      const result = await executeQuery(`
        query UserWithPosts($id: ID!) {
          user(id: $id) {
            id
            name
            posts {
              id
              title
            }
          }
        }
      `, { id: testUsers.alice.id });

      expect(result.errors).toBeUndefined();
      expect(result.data?.user.posts).toBeDefined();
      expect(Array.isArray(result.data?.user.posts)).toBe(true);
    });
  });
});
