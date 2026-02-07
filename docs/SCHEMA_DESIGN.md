# GraphQL Schema Design Best Practices

A comprehensive guide to designing scalable, maintainable GraphQL schemas with Apollo Server.

## Table of Contents

- [Schema-First vs Code-First](#schema-first-vs-code-first)
- [Type Design Principles](#type-design-principles)
- [Query Design](#query-design)
- [Mutation Design](#mutation-design)
- [Subscription Design](#subscription-design)
- [Error Handling](#error-handling)
- [Pagination Patterns](#pagination-patterns)
- [Real-World Examples](#real-world-examples)

---

## Schema-First vs Code-First

This template uses a **schema-first** approach with GraphQL SDL (Schema Definition Language).

### Schema-First (This Template)

**Advantages:**
- Clear contract between frontend and backend
- Easy to read and understand
- Native GraphQL syntax
- Familiar to frontend developers

**Example:**
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  posts: [Post!]!
}
```

### Code-First Alternative

Tools like **TypeGraphQL** or **Pothos** allow defining schemas in TypeScript:

```typescript
@ObjectType()
class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  name: string;

  @Field(() => [Post])
  posts: Post[];
}
```

**When to use code-first:**
- Heavy TypeScript codebase
- Need compile-time validation
- Complex business logic in schema

---

## Type Design Principles

### 1. Use Non-Null (`!`) Appropriately

**Good:**
```graphql
type User {
  id: ID!           # Always exists
  email: String!    # Required field
  name: String!     # Never null
  bio: String       # Optional
  avatar: String    # Optional
}
```

**Bad:**
```graphql
type User {
  id: ID           # Could be null? No!
  email: String!   # Good
  name: String     # Should this be nullable?
}
```

**Rule of Thumb:**
- Required database fields → `!`
- Optional database fields → nullable
- IDs → always `ID!`

### 2. Avoid Over-Nesting

**Bad:**
```graphql
type Query {
  user(id: ID!): UserWrapper
}

type UserWrapper {
  userData: UserData
}

type UserData {
  user: User
}
```

**Good:**
```graphql
type Query {
  user(id: ID!): User
}

type User {
  id: ID!
  email: String!
}
```

### 3. Single Responsibility Types

**Bad:**
```graphql
type UserProfile {
  id: ID!
  email: String!
  posts: [Post!]!
  settings: Settings!
  analytics: Analytics!
  billingInfo: BillingInfo!
}
```

**Good:**
```graphql
type User {
  id: ID!
  email: String!
  profile: Profile!
  settings: Settings!
}

type Profile {
  bio: String
  avatar: String
  posts: [Post!]!
}
```

### 4. Use Enums for Fixed Values

**Good:**
```graphql
enum UserRole {
  ADMIN
  MODERATOR
  USER
  GUEST
}

type User {
  role: UserRole!
}
```

**Bad:**
```graphql
type User {
  role: String!  # Could be anything!
}
```

---

## Query Design

### 1. Singular vs Plural Queries

```graphql
type Query {
  # Singular - fetch by ID
  user(id: ID!): User
  post(id: ID!): Post

  # Plural - fetch collections
  users(first: Int, after: String): UserConnection!
  posts(filter: PostFilter, first: Int): PostConnection!
}
```

### 2. Filter Arguments

**Good:**
```graphql
input PostFilter {
  tag: String
  authorId: ID
  published: Boolean
  search: String
}

type Query {
  posts(filter: PostFilter, first: Int): PostConnection!
}
```

**Bad:**
```graphql
type Query {
  posts(
    tag: String
    authorId: ID
    published: Boolean
    search: String
    first: Int
  ): [Post!]!
}
```

### 3. Field Arguments

Use field arguments for related data with filters:

```graphql
type User {
  id: ID!
  posts(
    first: Int
    published: Boolean
  ): [Post!]!
  comments(limit: Int): [Comment!]!
}
```

---

## Mutation Design

### 1. Input Objects

**Always use input types** for mutations:

**Good:**
```graphql
input CreatePostInput {
  title: String!
  content: String!
  tags: [String!]
  published: Boolean
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}
```

**Bad:**
```graphql
type Mutation {
  createPost(
    title: String!
    content: String!
    tags: [String!]
    published: Boolean
  ): Post!
}
```

### 2. Payload Types

Return rich payloads with error handling:

```graphql
type CreatePostPayload {
  post: Post
  errors: [MutationError!]
  success: Boolean!
}

type MutationError {
  field: String
  message: String!
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
}
```

### 3. Naming Conventions

```graphql
# CRUD operations
createPost(input: CreatePostInput!): Post!
updatePost(id: ID!, input: UpdatePostInput!): Post!
deletePost(id: ID!): Boolean!

# Specific actions
publishPost(id: ID!): Post!
archivePost(id: ID!): Post!
```

---

## Subscription Design

### 1. Event-Based Naming

**Good:**
```graphql
type Subscription {
  postCreated: Post!
  postUpdated(id: ID): Post!
  postDeleted: ID!
  commentAdded(postId: ID!): Comment!
}
```

**Bad:**
```graphql
type Subscription {
  post: Post!           # Too vague
  newComment: Comment!  # Inconsistent naming
}
```

### 2. Subscription Filters

Allow clients to subscribe to specific events:

```graphql
type Subscription {
  postUpdated(
    id: ID
    authorId: ID
  ): Post!

  commentAdded(
    postId: ID!
  ): Comment!
}
```

### 3. Subscription Payload

Return complete objects, not just IDs:

**Good:**
```graphql
type Subscription {
  postCreated: Post!  # Full object
}
```

**Bad:**
```graphql
type Subscription {
  postCreated: ID!     # Just ID - requires follow-up query
}
```

---

## Error Handling

### 1. Field-Level Errors

**Good:**
```graphql
type Query {
  user(id: ID!): User  # Nullable - can return null on error
}
```

Resolver:
```typescript
userResolver: async (_, { id }) => {
  try {
    return await findUser(id);
  } catch (error) {
    // Log error
    return null;  // GraphQL allows null
  }
}
```

### 2. Mutation Errors

**Best Practice:**
```graphql
type CreateUserPayload {
  user: User
  errors: [UserError!]
}

type UserError {
  field: String
  message: String!
  code: String!
}
```

Implementation:
```typescript
const resolvers = {
  Mutation: {
    createUser: async (_, { input }) => {
      const validation = validateInput(input);
      if (!validation.success) {
        return {
          user: null,
          errors: validation.errors.map(e => ({
            field: e.path,
            message: e.message,
            code: 'VALIDATION_ERROR'
          }))
        };
      }
      
      const user = await createUser(input);
      return { user, errors: [] };
    }
  }
};
```

### 3. Global Error Handling

Use Apollo Server error formatting:

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (formattedError, error) => {
    // Don't expose internal errors
    if (formattedError.message.startsWith('Database')) {
      return new GraphQLError('Internal server error', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR'
        }
      });
    }
    
    return formattedError;
  }
});
```

---

## Pagination Patterns

### 1. Relay-Style Cursor Pagination (Recommended)

**Schema:**
```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  cursor: String!
  node: User!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  users(first: Int, after: String): UserConnection!
}
```

**Advantages:**
- Works with any data source
- Stable cursors
- Supports bidirectional pagination

### 2. Offset Pagination (Simple)

**Schema:**
```graphql
type UserPage {
  users: [User!]!
  total: Int!
  page: Int!
  pageSize: Int!
}

type Query {
  users(page: Int, pageSize: Int): UserPage!
}
```

**Advantages:**
- Simple to implement
- Clients can jump to any page

**Disadvantages:**
- Not stable (data shifts between requests)
- Slow for large offsets

### 3. When to Use Each

| Pattern | Use Case |
|---------|----------|
| **Cursor** | Infinite scroll, large datasets, real-time data |
| **Offset** | Admin panels, small datasets, page numbers required |

---

## Real-World Examples

### E-Commerce Schema

```graphql
type Product {
  id: ID!
  name: String!
  description: String
  price: Money!
  images: [Image!]!
  variants: [ProductVariant!]!
  reviews: ReviewConnection!
  inStock: Boolean!
}

type Money {
  amount: Float!
  currency: String!
}

type ProductVariant {
  id: ID!
  sku: String!
  price: Money!
  attributes: [Attribute!]!
  inStock: Boolean!
}

type Query {
  product(id: ID!): Product
  products(
    category: ID
    search: String
    minPrice: Float
    maxPrice: Float
    inStock: Boolean
    first: Int
    after: String
  ): ProductConnection!
}

type Mutation {
  addToCart(input: AddToCartInput!): Cart!
  checkout(input: CheckoutInput!): Order!
}
```

### Social Media Schema

```graphql
type User {
  id: ID!
  username: String!
  followers: UserConnection!
  following: UserConnection!
  posts: PostConnection!
  isFollowing: Boolean!  # Contextual to current user
}

type Post {
  id: ID!
  content: String!
  author: User!
  likes: LikeConnection!
  comments: CommentConnection!
  isLiked: Boolean!      # Contextual
  createdAt: DateTime!
}

type Query {
  feed(first: Int, after: String): PostConnection!
  user(username: String!): User
  trending(limit: Int): [Post!]!
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
  likePost(postId: ID!): Post!
  followUser(userId: ID!): User!
}

type Subscription {
  newPostInFeed: Post!
  notificationReceived: Notification!
}
```

---

## Anti-Patterns to Avoid

### 1. ❌ God Objects

```graphql
type Everything {
  user: User!
  posts: [Post!]!
  comments: [Comment!]!
  analytics: Analytics!
  settings: Settings!
  # ... too much!
}
```

### 2. ❌ Deep Nesting

```graphql
type Query {
  data: DataWrapper
}

type DataWrapper {
  user: UserWrapper
}

type UserWrapper {
  userData: UserData
}

type UserData {
  user: User
}
```

### 3. ❌ Mutations Without Inputs

```graphql
type Mutation {
  createPost(title: String!, content: String!): Post!
}
```

**Use input objects instead!**

### 4. ❌ No Pagination

```graphql
type Query {
  allUsers: [User!]!  # Could return millions!
}
```

---

## Schema Evolution

### Adding Fields

**Safe:**
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  bio: String        # NEW - optional
}
```

### Deprecating Fields

```graphql
type User {
  id: ID!
  name: String! @deprecated(reason: "Use firstName and lastName")
  firstName: String!
  lastName: String!
}
```

### Breaking Changes

**Avoid:**
- Removing fields
- Changing field types
- Making nullable fields non-null

**Instead:**
- Add new fields
- Deprecate old fields
- Version your API (v1, v2)

---

## Tooling

### Schema Validation

```bash
npm install -g @graphql-inspector/cli

# Check for breaking changes
graphql-inspector diff old-schema.graphql new-schema.graphql
```

### Schema Documentation

Use GraphQL comments:

```graphql
"""
A user account in the system.
Supports authentication and content creation.
"""
type User {
  "Unique identifier"
  id: ID!
  
  "Email address (must be unique)"
  email: String!
  
  "Public display name"
  name: String!
}
```

---

## Further Reading

- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Apollo Server Docs](https://www.apollographql.com/docs/apollo-server/)
- [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [Production Ready GraphQL](https://book.productionreadygraphql.com/)

