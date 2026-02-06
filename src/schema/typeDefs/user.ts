/**
 * User type definitions (SDL)
 */

export const userTypeDefs = /* GraphQL */ `
  """
  User roles for authorization
  """
  enum UserRole {
    ADMIN
    USER
    GUEST
  }

  """
  A registered user
  """
  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    bio: String
    posts: [Post!]!
    comments: [Comment!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateUserInput {
    email: String!
    name: String!
    password: String!
    bio: String
  }

  input UpdateUserInput {
    name: String
    bio: String
  }

  type Query {
    """Get user by ID"""
    user(id: ID!): User

    """Get all users (admin only)"""
    users(first: Int, after: String): UserConnection!

    """Get current authenticated user"""
    me: User
  }

  type Mutation {
    """Update a user profile"""
    updateUser(id: ID!, input: UpdateUserInput!): User!

    """Delete a user account (admin only)"""
    deleteUser(id: ID!): Boolean!
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }
`;
