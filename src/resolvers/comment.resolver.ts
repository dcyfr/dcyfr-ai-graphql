/**
 * Comment resolvers
 */

import { CommentService } from '../services/comment.service.js';
import { requireAuth } from '../middleware/auth.js';
import { pubsub, EVENTS } from '../subscriptions/pubsub.js';
import type { GraphQLContext, Comment } from '../lib/types.js';
import { withFilter } from 'graphql-subscriptions';

export const commentResolvers = {
  Query: {
    comments: async (_: unknown, { postId }: { postId: string }, ctx: GraphQLContext) => {
      return ctx.loaders.commentsByPostLoader.load(postId);
    },
  },

  Mutation: {
    createComment: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx.user);
      const commentService = new CommentService();
      const comment = await commentService.create(user.id, input);

      await pubsub.publish(EVENTS.COMMENT_ADDED, { commentAdded: comment });
      return comment;
    },

    deleteComment: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx.user);
      const commentService = new CommentService();
      return commentService.delete(id, user.id);
    },
  },

  Subscription: {
    commentAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([EVENTS.COMMENT_ADDED]),
        (payload: { commentAdded: Comment }, variables: { postId: string }) => {
          return payload.commentAdded.postId === variables.postId;
        }
      ),
    },
  },

  Comment: {
    author: async (parent: Comment, _: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.userLoader.load(parent.authorId);
    },

    post: async (parent: Comment, _: unknown, ctx: GraphQLContext) => {
      return ctx.loaders.postLoader.load(parent.postId);
    },
  },
};
