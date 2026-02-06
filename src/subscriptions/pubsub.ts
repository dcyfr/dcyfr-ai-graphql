/**
 * PubSub for GraphQL subscriptions
 * Simple in-memory PubSub - production: use Redis PubSub
 */

import { PubSub } from 'graphql-subscriptions';

/**
 * Singleton PubSub instance
 * For production, replace with:
 * - RedisPubSub (from graphql-redis-subscriptions)
 * - Google PubSub (from @google-cloud/pubsub)
 */
export const pubsub = new PubSub();

/**
 * Subscription event names
 */
export const EVENTS = {
  POST_CREATED: 'POST_CREATED',
  POST_UPDATED: 'POST_UPDATED',
  COMMENT_ADDED: 'COMMENT_ADDED',
} as const;
