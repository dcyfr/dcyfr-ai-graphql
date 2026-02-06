/**
 * Comment service - business logic for comment operations
 */

import { db } from '../lib/db/index.js';
import { validateInput, createCommentSchema } from '../lib/schemas/validation.js';
import type { Comment } from '../lib/types.js';

export class CommentService {
  async getByPost(postId: string): Promise<Comment[]> {
    return db.getCommentsByPost(postId);
  }

  async getByPostIds(postIds: string[]): Promise<Map<string, Comment[]>> {
    return db.getCommentsByPostIds(postIds);
  }

  async getByAuthor(authorId: string): Promise<Comment[]> {
    return db.getCommentsByAuthor(authorId);
  }

  async create(authorId: string, input: unknown): Promise<Comment> {
    const data = validateInput(createCommentSchema, input);

    // Verify post exists
    const post = db.findPostById(data.postId);
    if (!post) throw new Error('Post not found');

    return db.createComment({
      content: data.content,
      authorId,
      postId: data.postId,
    });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const comment = db.findCommentById(id);
    if (!comment) throw new Error('Comment not found');
    if (comment.authorId !== userId) throw new Error('Not authorized to delete this comment');
    return db.deleteComment(id);
  }
}
