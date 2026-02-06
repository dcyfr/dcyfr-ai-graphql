/**
 * Base type definitions - shared types, scalars, directives
 */

export const baseTypeDefs = /* GraphQL */ `
  """
  Custom DateTime scalar (ISO-8601)
  """
  scalar DateTime

  """
  Custom JSON scalar for arbitrary data
  """
  scalar JSON

  """
  Pagination info for cursor-based pagination
  """
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  type Query {
    """API health check"""
    health: HealthCheck!
  }

  type Mutation {
    """Placeholder - extended by domain types"""
    _empty: String
  }

  type Subscription {
    """Placeholder - extended by domain types"""
    _empty: String
  }

  type HealthCheck {
    status: String!
    timestamp: DateTime!
    version: String!
  }
`;
