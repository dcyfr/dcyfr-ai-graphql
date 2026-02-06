/**
 * Schema builder - merges type definitions and resolvers
 */

import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './typeDefs/index.js';
import { resolvers } from '../resolvers/index.js';

/**
 * Build the executable GraphQL schema
 */
export function buildSchema() {
  return makeExecutableSchema({
    typeDefs,
    resolvers,
  });
}

export { typeDefs };
