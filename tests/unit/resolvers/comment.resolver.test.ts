/**
 * Comment resolver tests
 */

import { describe, it, expect } from 'vitest';
import { executeQuery, testUsers } from '../../helpers/test-utils.js';

describe('Comment Resolvers', () => {
  describe('Query.comments', () => {
    it('should fetch comments for a post', async () => {
      // Get a post ID first
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

      const result = await executeQuery(`
        query GetComments($postId: ID!) {
          comments(postId: $postId) {
            id
            content
            author {
              id
              name
            }
          }
        }
      `, { postId });

      expect(result.errors).toBeUndefined();
      expect(Array.isArray(result.data?.comments)).toBe(true);
    });
  });

  describe('Mutation.createComment', () => {
    it('should create a comment when authenticated', async () => {
      // Get a post ID
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

      const result = await executeQuery(`
        mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
            content
            author {
              id
              name
            }
            post {
              id
            }
          }
        }
      `, {
        input: {
          content: 'Great test post!',
          postId,
        },
      }, testUsers.bob);

      expect(result.errors).toBeUndefined();
      expect(result.data?.createComment.content).toBe('Great test post!');
      expect(result.data?.createComment.author.id).toBe(testUsers.bob.id);
    });

    it('should reject unauthenticated comment creation', async () => {
      const result = await executeQuery(`
        mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
          }
        }
      `, {
        input: {
          content: 'Unauthorized comment',
          postId: 'id_4',
        },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Authentication required');
    });

    it('should reject comment on non-existent post', async () => {
      const result = await executeQuery(`
        mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
          }
        }
      `, {
        input: {
          content: 'Comment on missing post',
          postId: 'non-existent-post',
        },
      }, testUsers.alice);

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]?.message).toContain('Post not found');
    });
  });

  describe('Mutation.deleteComment', () => {
    it('should reject deleting another users comment', async () => {
      // Get existing comment from seed data
      const listResult = await executeQuery(`
        query ListPosts {
          posts(first: 1) {
            edges {
              node {
                id
                comments {
                  id
                  author {
                    id
                  }
                }
              }
            }
          }
        }
      `);

      const post = listResult.data?.posts.edges[0]?.node;
      if (post?.comments?.length > 0) {
        const comment = post.comments[0];
        // Try to delete as a different user
        const deleteBy = comment.author.id === testUsers.alice.id ? testUsers.bob : testUsers.alice;

        const result = await executeQuery(`
          mutation DeleteComment($id: ID!) {
            deleteComment(id: $id)
          }
        `, { id: comment.id }, deleteBy);

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0]?.message).toContain('Not authorized');
      }
    });
  });

  describe('Comment field resolvers', () => {
    it('should resolve comment author and post', async () => {
      // Create a comment first
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

      const createResult = await executeQuery(`
        mutation CreateComment($input: CreateCommentInput!) {
          createComment(input: $input) {
            id
            content
            author {
              id
              name
              email
            }
            post {
              id
              title
            }
          }
        }
      `, {
        input: { content: 'Field resolver test', postId },
      }, testUsers.alice);

      expect(createResult.errors).toBeUndefined();
      expect(createResult.data?.createComment.author.name).toBe('Alice Johnson');
      expect(createResult.data?.createComment.post.id).toBe(postId);
    });
  });
});
