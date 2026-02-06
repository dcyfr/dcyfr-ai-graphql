/**
 * User resolvers
 */

import { UserService } from '../services/user.service.js';
import { PostService } from '../services/post.service.js';
import { CommentService } from '../services/comment.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { buildConnection, decodeCursor } from '../lib/utils/pagination.js';
import type { GraphQLContext, User, PaginationArgs } from '../lib/types.js';

export const userResolvers = {
  Query: {
    user: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      return ctx.loaders.userLoader.load(id);
    },

    users: async (
      _: unknown,
      { first, after }: PaginationArgs,
      ctx: GraphQLContext
    ) => {
      const userService = new UserService(ctx.config);
      const afterId = after ? decodeCursor(after) : undefined;
      const { users, hasMore } = await userService.list(first ?? 20, afterId);
      return buildConnection(users, hasMore, userService.getCount());
    },

    me: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx.user);
      return ctx.loaders.userLoader.load(user.id);
    },
  },

  Mutation: {
    updateUser: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx.user);
      // Users can only update themselves (admins can update anyone)
      if (user.id !== id && user.role !== 'ADMIN') {
        throw new Error('Not authorized to update this user');
      }
      const userService = new UserService(ctx.config);
      return userService.update(id, input);
    },

    deleteUser: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      requireAdmin(ctx.user);
      const userService = new UserService(ctx.config);
      return userService.delete(id);
    },
  },

  User: {
    posts: async (parent: User) => {
      const postService = new PostService();
      return postService.getByAuthor(parent.id);
    },

    comments: async (parent: User) => {
      const commentService = new CommentService();
      return commentService.getByAuthor(parent.id);
    },
  },
};
