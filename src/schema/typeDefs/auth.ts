/**
 * Auth type definitions (SDL)
 */

export const authTypeDefs = /* GraphQL */ `
  """
  Authentication payload returned after login/register
  """
  type AuthPayload {
    token: String!
    user: User!
  }

  input LoginInput {
    email: String!
    password: String!
    name: String
  }

  extend type Mutation {
    """Register a new user"""
    register(input: CreateUserInput!): AuthPayload!

    """Login with email and password"""
    login(input: LoginInput!): AuthPayload!
  }
`;
