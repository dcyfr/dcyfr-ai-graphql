/**
 * In-memory data store
 * Production: Replace with PostgreSQL/Drizzle ORM
 */

import type { User, Post, Comment } from '../types.js';
import { UserRole } from '../types.js';

/**
 * Simple in-memory database for template purposes
 */
class InMemoryDB {
  private users: Map<string, User & { passwordHash: string }> = new Map();
  private posts: Map<string, Post> = new Map();
  private comments: Map<string, Comment> = new Map();
  private idCounter = 0;

  constructor() {
    this.seed();
  }

  private nextId(): string {
    return `id_${++this.idCounter}`;
  }

  /**
   * Seed with sample data
   */
  private seed(): void {
    const now = new Date();

    // Users
    const user1Id = this.nextId();
    const user2Id = this.nextId();
    const adminId = this.nextId();

    this.users.set(user1Id, {
      id: user1Id,
      email: 'alice@example.com',
      name: 'Alice Johnson',
      role: UserRole.USER,
      bio: 'Full-stack developer',
      passwordHash: 'hashed_password_1',
      createdAt: now,
      updatedAt: now,
    });

    this.users.set(user2Id, {
      id: user2Id,
      email: 'bob@example.com',
      name: 'Bob Smith',
      role: UserRole.USER,
      bio: 'DevOps engineer',
      passwordHash: 'hashed_password_2',
      createdAt: now,
      updatedAt: now,
    });

    this.users.set(adminId, {
      id: adminId,
      email: 'admin@example.com',
      name: 'Admin',
      role: UserRole.ADMIN,
      passwordHash: 'hashed_admin_password',
      createdAt: now,
      updatedAt: now,
    });

    // Posts
    const post1Id = this.nextId();
    const post2Id = this.nextId();

    this.posts.set(post1Id, {
      id: post1Id,
      title: 'Getting Started with GraphQL',
      content: 'GraphQL is a query language for APIs...',
      published: true,
      authorId: user1Id,
      tags: ['graphql', 'tutorial'],
      createdAt: now,
      updatedAt: now,
    });

    this.posts.set(post2Id, {
      id: post2Id,
      title: 'Advanced TypeScript Patterns',
      content: 'TypeScript offers powerful type-level programming...',
      published: true,
      authorId: user2Id,
      tags: ['typescript', 'advanced'],
      createdAt: now,
      updatedAt: now,
    });

    // Comments
    const comment1Id = this.nextId();
    this.comments.set(comment1Id, {
      id: comment1Id,
      content: 'Great article!',
      authorId: user2Id,
      postId: post1Id,
      createdAt: now,
    });
  }

  // ─── User Operations ────────────────────────────────────────

  findUserById(id: string): (User & { passwordHash: string }) | undefined {
    return this.users.get(id);
  }

  findUserByEmail(email: string): (User & { passwordHash: string }) | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  findUsersByIds(ids: string[]): (User | null)[] {
    return ids.map((id) => {
      const user = this.users.get(id);
      if (!user) return null;
      const { passwordHash: _, ...rest } = user;
      return rest;
    });
  }

  listUsers(limit = 20, afterCursor?: string): { users: User[]; hasMore: boolean } {
    const allUsers = [...this.users.values()].map(({ passwordHash: _, ...u }) => u);
    let startIndex = 0;

    if (afterCursor) {
      const cursorIndex = allUsers.findIndex((u) => u.id === afterCursor);
      if (cursorIndex >= 0) startIndex = cursorIndex + 1;
    }

    const users = allUsers.slice(startIndex, startIndex + limit);
    return { users, hasMore: startIndex + limit < allUsers.length };
  }

  createUser(data: { email: string; name: string; passwordHash: string; bio?: string }): User {
    const id = this.nextId();
    const now = new Date();
    const user = {
      id,
      email: data.email,
      name: data.name,
      role: UserRole.USER,
      bio: data.bio,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  updateUser(id: string, data: { name?: string; bio?: string }): User | null {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    const { passwordHash: _, ...rest } = updated;
    return rest;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  getUserCount(): number {
    return this.users.size;
  }

  // ─── Post Operations ────────────────────────────────────────

  findPostById(id: string): Post | undefined {
    return this.posts.get(id);
  }

  findPostsByIds(ids: string[]): (Post | null)[] {
    return ids.map((id) => this.posts.get(id) ?? null);
  }

  listPosts(options: { limit?: number; afterCursor?: string; tag?: string; authorId?: string; publishedOnly?: boolean } = {}): { posts: Post[]; hasMore: boolean } {
    const { limit = 20, afterCursor, tag, authorId, publishedOnly = true } = options;

    let allPosts = [...this.posts.values()];
    if (publishedOnly) allPosts = allPosts.filter((p) => p.published);
    if (tag) allPosts = allPosts.filter((p) => p.tags.includes(tag));
    if (authorId) allPosts = allPosts.filter((p) => p.authorId === authorId);

    // Sort newest first
    allPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let startIndex = 0;
    if (afterCursor) {
      const idx = allPosts.findIndex((p) => p.id === afterCursor);
      if (idx >= 0) startIndex = idx + 1;
    }

    const posts = allPosts.slice(startIndex, startIndex + limit);
    return { posts, hasMore: startIndex + limit < allPosts.length };
  }

  getPostsByAuthor(authorId: string): Post[] {
    return [...this.posts.values()].filter((p) => p.authorId === authorId);
  }

  createPost(data: { title: string; content: string; authorId: string; tags?: string[]; published?: boolean }): Post {
    const id = this.nextId();
    const now = new Date();
    const post: Post = {
      id,
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      tags: data.tags ?? [],
      published: data.published ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.posts.set(id, post);
    return post;
  }

  updatePost(id: string, data: { title?: string; content?: string; tags?: string[]; published?: boolean }): Post | null {
    const post = this.posts.get(id);
    if (!post) return null;
    const updated = { ...post, ...data, updatedAt: new Date() };
    this.posts.set(id, updated);
    return updated;
  }

  deletePost(id: string): boolean {
    // Delete associated comments
    for (const [commentId, comment] of this.comments) {
      if (comment.postId === id) this.comments.delete(commentId);
    }
    return this.posts.delete(id);
  }

  getPostCount(publishedOnly = true): number {
    if (!publishedOnly) return this.posts.size;
    return [...this.posts.values()].filter((p) => p.published).length;
  }

  // ─── Comment Operations ─────────────────────────────────────

  findCommentById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  getCommentsByPost(postId: string): Comment[] {
    return [...this.comments.values()]
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getCommentsByPostIds(postIds: string[]): Map<string, Comment[]> {
    const result = new Map<string, Comment[]>();
    for (const postId of postIds) {
      result.set(postId, this.getCommentsByPost(postId));
    }
    return result;
  }

  getCommentsByAuthor(authorId: string): Comment[] {
    return [...this.comments.values()].filter((c) => c.authorId === authorId);
  }

  createComment(data: { content: string; authorId: string; postId: string }): Comment {
    const id = this.nextId();
    const comment: Comment = {
      id,
      content: data.content,
      authorId: data.authorId,
      postId: data.postId,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);
    return comment;
  }

  deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}

/**
 * Singleton database instance
 */
export const db = new InMemoryDB();
