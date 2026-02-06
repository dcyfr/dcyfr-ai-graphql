/**
 * Post resolver tests
 */

import { describe, it, expect } from 'vitest';
import { executeQuery, testUsers } from '../../helpers/test-utils.js';

describe('Post Resolvers', () => {
  describe('Query.posts', () => {
    it('should list posts with pagination', async () => {
      const result = await executeQuery(`
        query ListPosts {
          posts(first: 10) {
            edges {
              node {
                id
                title
                published
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
      expect(result.data?.posts.edges.length).toBeGreaterThan(0);
    });
  });

  describe('Query.post', () => {
    it('should fetch a post by id', async () => {
      // First get a post id from listing
      const listResult = await executeQuery(`
        query ListPosts {
          posts(first: 1) {
            edges {
              node {
                id
              }
            }
          }
        }
      `);

      const postId = listResult.data?.posts.edges[0]?.node.id;
      expect(postId).toBeDefined();

      const result = await executeQuery(`
        query GetPost($id: ID!) {
          post(id: $id) {
            id
            title
            content
            published
            tags
            author {
              id
              name
            }
          }
        }
      `, { id: postId });

      expect(result.errors).toBeUndefined();
      expect(result.data?.post).toBeDefined();
      expect(result.data?.post.title).toBeDefined();
      expect(result.data?.post.author).toBeDefined();
    });
  });

  describe('Mutation.createPost', () => {
    it('should create a post when authenticated', async () => {
      const result = await executeQuery(`
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
            title
            content
            published
            tags
          }
        }
      `, {
        input: {
          title: 'Test Post',
          content: 'Test content for the post',
          tags: ['test', 'vitest'],
          published: true,
        },
      }, testUsers.alice);

      expect(result.errors).toBeUndefined();
      expect(result.data?.createPost).toMatchObject({
        title: 'Test Post',
        content: 'Test content for the post',
        published: true,
        tags: ['test', 'vitest'],
      });
      expect(result.data?.createPost.id).toBeDefined();
    });

    it('should reject unauthenticated post creation', async () => {
      const result = await executeQuery(`
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
          }
        }
      `, {
        input: {
          title: 'Unauthorized Post',
          content: 'Should fail',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Authentication required');
    });

    it('should validate post input', async () => {
      const result = await executeQuery(`
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
          }
        }
      `, {
        input: {
          title: '', // Empty title should fail
          content: 'Some content',
        },
      }, testUsers.alice);

      expect(result.errors).toBeDefined();
    });
  });

  describe('Mutation.updatePost', () => {
    it('should update own post', async () => {
      // Create a post first
      const createResult = await executeQuery(`
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
          }
        }
      `, {
        input: { title: 'To Update', content: 'Content' },
      }, testUsers.alice);

      const postId = createResult.data?.createPost.id;

      const result = await executeQuery(`
        mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
          updatePost(id: $id, input: $input) {
            id
            title
            published
          }
        }
      `, {
        id: postId,
        input: { title: 'Updated Title', published: true },
      }, testUsers.alice);

      expect(result.errors).toBeUndefined();
      expect(result.data?.updatePost.title).toBe('Updated Title');
      expect(result.data?.updatePost.published).toBe(true);
    });

    it('should reject updating another users post', async () => {
      // Create as alice
      const createResult = await executeQuery(`
        mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            id
          }
        }
      `, {
        input: { title: 'Alice Post', content: 'Content' },
      }, testUsers.alice);

      const postId = createResult.data?.createPost.id;

      // Try to update as bob
      const result = await executeQuery(`
        mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
          updatePost(id: $id, input: $input) {
            id
          }
        }
      `, {
        id: postId,
        input: { title: 'Bob Hacked' },
      }, testUsers.bob);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Not authorized');
    });
  });

  describe('Post.author', () => {
    it('should resolve post author', async () => {
      const result = await executeQuery(`
        query ListPosts {
          posts(first: 1) {
            edges {
              node {
                id
                title
                author {
                  id
                  name
                  email
                }
              }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const post = result.data?.posts.edges[0]?.node;
      expect(post?.author).toBeDefined();
      expect(post?.author.name).toBeDefined();
    });
  });

  describe('Post.comments', () => {
    it('should resolve post comments', async () => {
      const result = await executeQuery(`
        query ListPosts {
          posts(first: 1) {
            edges {
              node {
                id
                comments {
                  id
                  content
                }
              }
            }
          }
        }
      `);

      expect(result.errors).toBeUndefined();
      const post = result.data?.posts.edges[0]?.node;
      expect(post?.comments).toBeDefined();
      expect(Array.isArray(post?.comments)).toBe(true);
    });
  });
});
