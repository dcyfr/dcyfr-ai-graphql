# @dcyfr/ai-graphql

Production-ready GraphQL API server template with Apollo Server 4, schema-first design, type-safe resolvers, and real-time subscriptions.

## Features

- **Apollo Server 4** - Latest Apollo Server with Express integration
- **Schema-First Design** - GraphQL SDL type definitions with modular organization
- **Type-Safe Resolvers** - Full TypeScript types for all resolver contexts
- **DataLoader Pattern** - Automatic N+1 query prevention with batching
- **JWT Authentication** - Bearer token auth with role-based access control
- **Real-Time Subscriptions** - WebSocket subscriptions with `graphql-ws`
- **Input Validation** - Zod schemas for all mutation inputs
- **Cursor Pagination** - Relay-style connections with cursor-based pagination
- **Rate Limiting** - In-memory rate limiter (swap for Redis in production)
- **Request Logging** - Operation-level logging with timing

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server starts at `http://localhost:4000/graphql` with the Apollo Sandbox IDE.

## Project Structure

```
src/
├── index.ts                   # Server entry point
├── config/
│   └── env.ts                 # Environment configuration
├── schema/
│   ├── index.ts               # Schema builder
│   ├── typeDefs/              # GraphQL SDL type definitions
│   │   ├── base.ts            # Scalars, PageInfo, health check
│   │   ├── user.ts            # User type, queries, mutations
│   │   ├── post.ts            # Post type, CRUD, subscriptions
│   │   ├── comment.ts         # Comment type, subscriptions
│   │   └── auth.ts            # Auth mutations (register/login)
│   └── scalars/               # Custom scalar implementations
│       ├── datetime.ts        # DateTime scalar
│       └── json.ts            # JSON scalar
├── resolvers/                 # Resolver implementations
│   ├── index.ts               # Merged resolvers
│   ├── user.resolver.ts       # User queries/mutations
│   ├── post.resolver.ts       # Post CRUD + subscriptions
│   ├── comment.resolver.ts    # Comment CRUD + subscriptions
│   └── auth.resolver.ts       # Register/login mutations
├── services/                  # Business logic layer
│   ├── user.service.ts        # User operations + auth
│   ├── post.service.ts        # Post operations
│   └── comment.service.ts     # Comment operations
├── dataloaders/               # DataLoader implementations
│   ├── index.ts               # DataLoader factory
│   └── loader.ts              # Generic batching loader
├── middleware/                 # Express/GraphQL middleware
│   ├── auth.ts                # JWT extraction + guards
│   ├── rate-limit.ts          # Request rate limiting
│   └── logging.ts             # Operation logging
├── subscriptions/             # Real-time events
│   └── pubsub.ts              # PubSub setup + event names
└── lib/                       # Shared utilities
    ├── types.ts               # TypeScript type definitions
    ├── db/index.ts             # In-memory data store
    ├── schemas/validation.ts   # Zod validation schemas
    └── utils/
        ├── auth.ts            # Token + password utilities
        └── pagination.ts      # Cursor pagination helpers
```

## Schema Overview

### Types

- **User** - `id`, `email`, `name`, `role`, `bio`, `posts`, `comments`
- **Post** - `id`, `title`, `content`, `published`, `tags`, `author`, `comments`
- **Comment** - `id`, `content`, `author`, `post`

### Queries

```graphql
# Health check
health { status, timestamp, version }

# Users
user(id: ID!): User
users(first: Int, after: String): UserConnection!
me: User  # Requires auth

# Posts
post(id: ID!): Post
posts(first: Int, after: String, tag: String): PostConnection!

# Comments
comments(postId: ID!): [Comment!]!
```

### Mutations

```graphql
# Auth
register(input: CreateUserInput!): AuthPayload!
login(input: LoginInput!): AuthPayload!

# Users (requires auth)
updateUser(id: ID!, input: UpdateUserInput!): User!
deleteUser(id: ID!): Boolean!  # Admin only

# Posts (requires auth)
createPost(input: CreatePostInput!): Post!
updatePost(id: ID!, input: UpdatePostInput!): Post!
deletePost(id: ID!): Boolean!

# Comments (requires auth)
createComment(input: CreateCommentInput!): Comment!
deleteComment(id: ID!): Boolean!
```

### Subscriptions

```graphql
postCreated: Post!
postUpdated: Post!
commentAdded(postId: ID!): Comment!
```

## Environment Variables

```bash
PORT=4000                        # Server port
JWT_SECRET=your-secret-key       # JWT signing secret
JWT_EXPIRES_IN=7d                # Token expiration
RATE_LIMIT_WINDOW_MS=60000       # Rate limit window (ms)
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
```

## Authentication

Register or login to get a JWT token, then include it in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Testing

```bash
npm run test:run       # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report
npm run typecheck      # TypeScript check
```

## Production Notes

This template uses simplified implementations for demo purposes. For production:

| Component | Template | Production |
|-----------|----------|------------|
| Database | In-memory store | PostgreSQL + Drizzle ORM |
| Auth | Base64 tokens | `jsonwebtoken` or `jose` |
| Passwords | Simple hash | `bcrypt` or `argon2` |
| Rate Limiting | In-memory | Redis |
| PubSub | In-memory | Redis PubSub |
| DataLoader | Custom | `dataloader` npm package |

## License

MIT - See [LICENSE](LICENSE) for details.
