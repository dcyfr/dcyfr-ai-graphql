/**
 * Auth resolvers
 */

import { UserService } from '../services/user.service.js';
import type { GraphQLContext } from '../lib/types.js';

export const authResolvers = {
  Mutation: {
    register: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: GraphQLContext
    ) => {
      const userService = new UserService(ctx.config);
      return userService.register(input);
    },

    login: async (
      _: unknown,
      { input }: { input: unknown },
      ctx: GraphQLContext
    ) => {
      const userService = new UserService(ctx.config);
      return userService.login(input);
    },
  },
};
