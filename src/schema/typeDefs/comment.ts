/**
 * Comment type definitions (SDL)
 */

export const commentTypeDefs = /* GraphQL */ `
  """
  A comment on a post
  """
  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
    createdAt: DateTime!
  }

  input CreateCommentInput {
    content: String!
    postId: ID!
  }

  extend type Query {
    """Get comments for a post"""
    comments(postId: ID!): [Comment!]!
  }

  extend type Mutation {
    """Add a comment to a post"""
    createComment(input: CreateCommentInput!): Comment!

    """Delete a comment"""
    deleteComment(id: ID!): Boolean!
  }

  extend type Subscription {
    """Subscribe to new comments on a post"""
    commentAdded(postId: ID!): Comment!
  }
`;
