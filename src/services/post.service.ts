/**
 * Post service - business logic for post operations
 */

import { db } from '../lib/db/index.js';
import { validateInput, createPostSchema, updatePostSchema } from '../lib/schemas/validation.js';
import type { Post } from '../lib/types.js';

export class PostService {
  async findById(id: string): Promise<Post | null> {
    return db.findPostById(id) ?? null;
  }

  async findByIds(ids: string[]): Promise<(Post | null)[]> {
    return db.findPostsByIds(ids);
  }

  async list(options?: { limit?: number; afterCursor?: string; tag?: string }) {
    return db.listPosts(options);
  }

  async getByAuthor(authorId: string): Promise<Post[]> {
    return db.getPostsByAuthor(authorId);
  }

  async create(authorId: string, input: unknown): Promise<Post> {
    const data = validateInput(createPostSchema, input);
    return db.createPost({
      title: data.title,
      content: data.content,
      authorId,
      tags: data.tags,
      published: data.published,
    });
  }

  async update(id: string, authorId: string, input: unknown): Promise<Post> {
    const data = validateInput(updatePostSchema, input);

    const post = db.findPostById(id);
    if (!post) throw new Error('Post not found');
    if (post.authorId !== authorId) throw new Error('Not authorized to update this post');

    const updated = db.updatePost(id, data);
    if (!updated) throw new Error('Failed to update post');
    return updated;
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const post = db.findPostById(id);
    if (!post) throw new Error('Post not found');
    if (post.authorId !== authorId) throw new Error('Not authorized to delete this post');
    return db.deletePost(id);
  }

  getCount(): number {
    return db.getPostCount();
  }
}
