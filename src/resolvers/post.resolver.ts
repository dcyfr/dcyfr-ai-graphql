/**
 * Post resolvers
 */

import { PostService } from '../services/post.service.js';
import { requireAuth } from '../middleware/auth.js';
import { buildConnection, decodeCursor } from '../lib/utils/pagination.js';
import { pubsub, EVENTS } from '../subscriptions/pubsub.js';
import type { GraphQLContext, Post, PaginationArgs } from '../lib/types.js';

export const postResolvers = {
  Query: {
    post: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      return ctx.loaders.postLoader.load(id);
    },

    posts: async (
      _: unknown,
      { first, after, tag }: PaginationArgs & { tag?: string },
      _ctx: GraphQLContext
    ) => {
      const postService = new PostService();
      const afterId = after ? decodeCursor(after) : undefined;
      const { posts, hasMore } = await postService.list({
        limit: first ?? 20,
        afterCursor: afterId,
        tag,
      });
      return buildConnection(posts, hasMore, postService.getCount());
    },
  },

  Mutation: {
    createPost: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx.user);
      const postService = new PostService();
      const post = await postService.create(user.id, input);

      // Publish subscription event
      if (post.published) {
        await pubsub.publish(EVENTS.POST_CREATED, { postCreated: post });
      }

      return post;
    },

    updatePost: async (
      _: unknown,
      { id, input }: { id: string; input: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx.user);
      const postService = new PostService();
      const post = await postService.update(id, user.id, input);

      await pubsub.publish(EVENTS.POST_UPDATED, { postUpdated: post });
      return post;
    },

    deletePost: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx.user);
      const postService = new PostService();
      return postService.delete(id, user.id);
    },
  },

  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.POST_CREATED]),
    },

    postUpdated: {
      subscribe: () => pubsub.asyncIterator([EVENTS.POST_UPDATED]),
    },
  },

  Post: {
    author: async (parent: Post, _: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.userLoader.load(parent.authorId);
    },

    comments: async (parent: Post, _: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.commentsByPostLoader.load(parent.id);
    },
  },
};
