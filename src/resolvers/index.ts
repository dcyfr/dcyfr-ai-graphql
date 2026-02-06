/**
 * Merged resolvers
 */

import { mergeResolvers } from '@graphql-tools/merge';
import { DateTimeScalar, JSONScalar } from '../schema/scalars/index.js';
import { userResolvers } from './user.resolver.js';
import { postResolvers } from './post.resolver.js';
import { commentResolvers } from './comment.resolver.js';
import { authResolvers } from './auth.resolver.js';

/**
 * Health check and scalar resolvers
 */
const baseResolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,

  Query: {
    health: () => ({
      status: 'ok',
      timestamp: new Date(),
      version: '1.0.0',
    }),
  },
};

/**
 * All resolvers merged into a single resolver map
 */
export const resolvers = mergeResolvers([
  baseResolvers,
  userResolvers,
  postResolvers,
  commentResolvers,
  authResolvers,
]);
