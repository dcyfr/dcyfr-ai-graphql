/**
 * Post type definitions (SDL)
 */

export const postTypeDefs = /* GraphQL */ `
  """
  A blog post
  """
  type Post {
    id: ID!
    title: String!
    content: String!
    published: Boolean!
    author: User!
    tags: [String!]!
    comments: [Comment!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreatePostInput {
    title: String!
    content: String!
    tags: [String!]
    published: Boolean
  }

  input UpdatePostInput {
    title: String
    content: String
    tags: [String!]
    published: Boolean
  }

  extend type Query {
    """Get post by ID"""
    post(id: ID!): Post

    """List published posts with pagination"""
    posts(first: Int, after: String, tag: String): PostConnection!
  }

  extend type Mutation {
    """Create a new post"""
    createPost(input: CreatePostInput!): Post!

    """Update an existing post"""
    updatePost(id: ID!, input: UpdatePostInput!): Post!

    """Delete a post"""
    deletePost(id: ID!): Boolean!
  }

  extend type Subscription {
    """Subscribe to new posts"""
    postCreated: Post!

    """Subscribe to post updates"""
    postUpdated: Post!
  }

  type PostConnection {
    edges: [PostEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type PostEdge {
    node: Post!
    cursor: String!
  }
`;
