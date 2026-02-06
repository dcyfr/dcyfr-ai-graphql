/**
 * Test helpers for GraphQL resolver testing
 */

import { makeExecutableSchema } from '@graphql-tools/schema';
import { graphql, type GraphQLSchema } from 'graphql';
import { typeDefs } from '../../src/schema/typeDefs/index.js';
import { resolvers } from '../../src/resolvers/index.js';
import { createDataLoaders } from '../../src/dataloaders/index.js';
import { loadConfig } from '../../src/config/env.js';
import { createToken } from '../../src/lib/utils/auth.js';
import type { GraphQLContext, AuthUser } from '../../src/lib/types.js';
import { UserRole } from '../../src/lib/types.js';

let schema: GraphQLSchema | null = null;

/**
 * Get or create the executable schema (cached)
 */
export function getSchema(): GraphQLSchema {
  if (!schema) {
    schema = makeExecutableSchema({ typeDefs, resolvers });
  }
  return schema;
}

/**
 * Create a test context with optional authenticated user
 */
export function createTestContext(user?: AuthUser | null): GraphQLContext {
  const config = loadConfig();
  return {
    user: user ?? null,
    loaders: createDataLoaders(config),
    config,
    request: { ip: '127.0.0.1', userAgent: 'test-client' },
  };
}

/**
 * Execute a GraphQL query for testing
 */
export async function executeQuery(
  query: string,
  variables?: Record<string, unknown>,
  user?: AuthUser | null
) {
  const result = await graphql({
    schema: getSchema(),
    source: query,
    contextValue: createTestContext(user),
    variableValues: variables,
  });
  return result;
}

/**
 * Test user fixtures
 */
export const testUsers = {
  admin: {
    id: 'id_3',
    email: 'admin@example.com',
    name: 'Admin',
    role: UserRole.ADMIN,
  } satisfies AuthUser,

  alice: {
    id: 'id_1',
    email: 'alice@example.com',
    name: 'Alice Johnson',
    role: UserRole.USER,
  } satisfies AuthUser,

  bob: {
    id: 'id_2',
    email: 'bob@example.com',
    name: 'Bob Smith',
    role: UserRole.USER,
  } satisfies AuthUser,
};

/**
 * Generate a test token for a user
 */
export function getTestToken(user: AuthUser): string {
  const config = loadConfig();
  return createToken(user, config.auth.jwtSecret, config.auth.jwtExpiresIn);
}
