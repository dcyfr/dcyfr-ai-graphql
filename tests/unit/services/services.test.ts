/**
 * Service layer tests
 */

import { describe, it, expect } from 'vitest';
import { UserService } from '../../../src/services/user.service.js';
import { PostService } from '../../../src/services/post.service.js';
import { CommentService } from '../../../src/services/comment.service.js';
import { loadConfig } from '../../../src/config/env.js';

describe('UserService', () => {
  const config = loadConfig();
  const service = new UserService(config);

  it('should find user by id', async () => {
    const user = await service.findById('id_1');
    expect(user).toBeDefined();
    expect(user?.email).toBe('alice@example.com');
  });

  it('should return null for non-existent user', async () => {
    const user = await service.findById('non-existent');
    expect(user).toBeNull();
  });

  it('should find user by email', async () => {
    const user = await service.findByEmail('bob@example.com');
    expect(user).toBeDefined();
    expect(user?.name).toBe('Bob Smith');
  });

  it('should list users', async () => {
    const result = await service.list(10);
    expect(result.users.length).toBeGreaterThan(0);
  });

  it('should register a new user', async () => {
    const result = await service.register({
      email: 'service-test@example.com',
      name: 'Service Test',
      password: 'testpassword123',
    });
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('service-test@example.com');
  });

  it('should get user count', () => {
    const count = service.getCount();
    expect(count).toBeGreaterThan(0);
  });
});

describe('PostService', () => {
  const service = new PostService();

  it('should list posts', async () => {
    const result = await service.list();
    expect(result.posts.length).toBeGreaterThan(0);
  });

  it('should create a post', async () => {
    const post = await service.create('id_1', {
      title: 'Service Test Post',
      content: 'Testing post creation from service',
      tags: ['test'],
      published: true,
    });
    expect(post.id).toBeDefined();
    expect(post.title).toBe('Service Test Post');
    expect(post.authorId).toBe('id_1');
  });

  it('should find post by id', async () => {
    const post = await service.findById('id_4');
    expect(post).toBeDefined();
    expect(post?.title).toBeDefined();
  });

  it('should get posts by author', async () => {
    const posts = await service.getByAuthor('id_1');
    expect(posts.length).toBeGreaterThan(0);
  });
});

describe('CommentService', () => {
  const service = new CommentService();

  it('should get comments by post', async () => {
    const comments = await service.getByPost('id_4');
    expect(Array.isArray(comments)).toBe(true);
  });

  it('should create a comment', async () => {
    const comment = await service.create('id_1', {
      content: 'Service test comment',
      postId: 'id_4',
    });
    expect(comment.id).toBeDefined();
    expect(comment.content).toBe('Service test comment');
  });

  it('should reject comment on non-existent post', async () => {
    await expect(
      service.create('id_1', {
        content: 'Bad comment',
        postId: 'non-existent',
      })
    ).rejects.toThrow('Post not found');
  });
});
