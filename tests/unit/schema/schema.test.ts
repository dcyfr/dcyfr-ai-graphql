/**
 * Schema validation tests
 */

import { describe, it, expect } from 'vitest';
import { buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../../../src/schema/typeDefs/index.js';
import { resolvers } from '../../../src/resolvers/index.js';

describe('GraphQL Schema', () => {
  it('should build a valid executable schema', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    expect(schema).toBeDefined();
  });

  it('should have Query type', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();
    expect(queryType?.name).toBe('Query');
  });

  it('should have Mutation type', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const mutationType = schema.getMutationType();
    expect(mutationType).toBeDefined();
    expect(mutationType?.name).toBe('Mutation');
  });

  it('should have Subscription type', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const subscriptionType = schema.getSubscriptionType();
    expect(subscriptionType).toBeDefined();
    expect(subscriptionType?.name).toBe('Subscription');
  });

  it('should define User type with required fields', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const userType = schema.getType('User');
    expect(userType).toBeDefined();
  });

  it('should define Post type', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const postType = schema.getType('Post');
    expect(postType).toBeDefined();
  });

  it('should define Comment type', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const commentType = schema.getType('Comment');
    expect(commentType).toBeDefined();
  });

  it('should define AuthPayload type', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const authType = schema.getType('AuthPayload');
    expect(authType).toBeDefined();
  });

  it('should define custom scalars', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    expect(schema.getType('DateTime')).toBeDefined();
    expect(schema.getType('JSON')).toBeDefined();
  });

  it('should define pagination types', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    expect(schema.getType('PageInfo')).toBeDefined();
    expect(schema.getType('UserConnection')).toBeDefined();
    expect(schema.getType('PostConnection')).toBeDefined();
  });

  it('should define health query', () => {
    const schema = makeExecutableSchema({ typeDefs, resolvers });
    const queryType = schema.getQueryType();
    const fields = queryType?.getFields();
    expect(fields?.['health']).toBeDefined();
  });
});
