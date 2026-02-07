# @dcyfr/ai-graphql

Production-ready GraphQL API server template with Apollo Server 4, schema-first design, type-safe resolvers, and real-time subscriptions. Perfect for building scalable APIs with best practices built-in.

## Features

### Core GraphQL
- **Apollo Server 4** - Latest Apollo Server with Express integration and health checks
- **Schema-First Design** - GraphQL SDL type definitions with modular organization
- **Type-Safe Resolvers** - Full TypeScript types for all resolver contexts
- **Custom Directives** - `@auth`, `@rateLimit`, `@cache` for declarative behavior
- **Custom Scalars** - DateTime, JSON with validation

### Performance & Optimization
- **DataLoader Pattern** - Automatic N+1 query prevention with intelligent batching
- **Cursor Pagination** - Relay-style connections with cursor-based pagination
- **Response Caching** - Field-level caching with TTL support
- **Query Complexity** - Protection against expensive queries

### Security & Auth
- **JWT Authentication** - Bearer token auth with role-based access control
- **Field-Level Authorization** - `@auth` directive for granular permissions
- **Rate Limiting** - Request throttling to prevent abuse
- **Input Validation** - Zod schemas for all mutation inputs

### Real-Time Features
- **WebSocket Subscriptions** - Server-sent events with `graphql-ws`
- **Event-Based PubSub** - Real-time notifications for posts and comments
- **Subscription Filtering** - Server-side event filtering

### Developer Experience
- **Hot Reload** - Instant feedback during development with tsx watch mode
- **Request Logging** - Operation-level logging with timing and error tracking
- **Apollo Sandbox** - Interactive GraphQL IDE built-in
- **Type Generation** - Full TypeScript support for schema and resolvers

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Server starts at http://localhost:4000/graphql
# Apollo Sandbox IDE available at http://localhost:4000/graphql
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start

# Run in production with PM2
pm2 start dist/index.js --name graphql-api
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive deployment guides (Kubernetes, AWS Lambda, Railway, Render, Fly.io).

## Examples

This template includes comprehensive executable examples demonstrating GraphQL patterns:

- **[examples/basic-queries/client.ts](examples/basic-queries/client.ts)** - Query patterns (pagination, filtering, nested relationships)
- **[examples/auth-flow/client.ts](examples/auth-flow/client.ts)** - Complete authentication flow (register, login, authenticated requests)
- **[examples/subscriptions/client.ts](examples/subscriptions/client.ts)** - Real-time subscriptions with WebSocket
- **[examples/resolvers.ts](examples/resolvers.ts)** - Advanced resolver patterns (DataLoader, computed fields, authorization)
- **[examples/custom-directives.ts](examples/custom-directives.ts)** - Schema directives (`@auth`, `@rateLimit`, `@cache`)

Run any example:
```bash
tsx examples/basic-queries/client.ts
tsx examples/auth-flow/client.ts
tsx examples/subscriptions/client.ts
```

## Documentation

Comprehensive guides for production GraphQL APIs:

- **[docs/SCHEMA_DESIGN.md](docs/SCHEMA_DESIGN.md)** - Schema design patterns, type design, pagination strategies
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment (Docker, Kubernetes, AWS Lambda, PaaS)
- **[docs/PERFORMANCE.md](docs/PERFORMANCE.md)** - N+1 prevention, DataLoader, caching, query optimization
- **[docs/TESTING.md](docs/TESTING.md)** - Unit/integration/E2E testing strategies with Vitest

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

## Performance Optimization

### N+1 Query Prevention

This template uses DataLoader to batch and cache database queries:

```typescript
// Without DataLoader - N+1 Problem
posts.forEach(async post => {
  const author = await db.users.findOne({ id: post.authorId }); // N queries!
});

// With DataLoader - 1 Batched Query
posts.forEach(async post => {
  const author = await context.loaders.user.load(post.authorId); // Batched!
});
```

See [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for comprehensive optimization strategies.

### Caching Strategies

**Field-Level Caching:**
```graphql
type Query {
  latestPosts: [Post!]! @cache(ttl: 300) # Cache for 5 minutes
}
```

**Redis Caching (Production):**
```typescript
import { RedisCache } from 'apollo-server-cache-redis';

const server = new ApolloServer({
  cache: new RedisCache({
    host: 'localhost',
    port: 6379,
  }),
});
```

### Query Complexity Limiting

```typescript
import { createComplexityPlugin } from 'graphql-query-complexity';

const server = new ApolloServer({
  plugins: [
    createComplexityPlugin({
      maximumComplexity: 1000,
      estimators: [simpleEstimator({ defaultComplexity: 1 })],
    }),
  ],
});
```

## Deployment

### Platform Options

| Platform | Deployment Time | Scaling | Best For |
|----------|----------------|---------|----------|
| **Docker** | 5 min | Manual/Swarm | Self-hosted, full control |
| **Kubernetes** | 30 min | Automatic HPA | Enterprise, high availability |
| **AWS Lambda** | 10 min | Automatic | Serverless, variable traffic |
| **Railway** | 2 min | Automatic | Rapid prototyping |
| **Render** | 3 min | Automatic | MVP, small teams |
| **Fly.io** | 5 min | Edge deployment | Global distribution |

### Quick Deploy Commands

**Docker:**
```bash
docker build -t graphql-api .
docker run -p 4000:4000 -e JWT_SECRET=secret graphql-api
```

**Kubernetes:**
```bash
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
kubectl apply -f k8s/hpa.yml
```

**AWS Lambda:**
```bash
npm install -g serverless
serverless deploy
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed platform guides.

### Environment Configuration

**Required:**
```bash
PORT=4000
JWT_SECRET=your-secret-key-min-32-chars
```

**Recommended for Production:**
```bash
NODE_ENV=production
ALLOWED_ORIGINS=https://yourapp.com
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

**Optional:**
```bash
JWT_EXPIRES_IN=7d
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## Monitoring & Observability

### Apollo Studio Integration

```typescript
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

const server = new ApolloServer({
  plugins: [
    ApolloServerPluginUsageReporting({
      apiKey: process.env.APOLLO_KEY,
    }),
  ],
});
```

### Prometheus Metrics

```typescript
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

// Custom GraphQL metrics
const operationCounter = new Counter({
  name: 'graphql_operations_total',
  help: 'Total GraphQL operations',
  labelNames: ['operation', 'status'],
});
```

Access metrics at `/metrics` endpoint.

## Production Checklist

Before deploying to production:

- [ ] Replace in-memory database with PostgreSQL/MongoDB
- [ ] Use `jsonwebtoken` or `jose` for JWT signing
- [ ] Hash passwords with `bcrypt` or `argon2`
- [ ] Deploy Redis for rate limiting and caching
- [ ] Configure CORS for your frontend domains
- [ ] Set up SSL/TLS certificates
- [ ] Enable Apollo Studio monitoring
- [ ] Configure Prometheus metrics
- [ ] Set up error tracking (Sentry)
- [ ] Enable query complexity limiting
- [ ] Implement DataLoader for all relationships
- [ ] Add database connection pooling
- [ ] Configure health check endpoints
- [ ] Set up CI/CD pipeline
- [ ] Create backup strategy for database

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

## Architecture Highlights

### Schema-First vs Code-First

This template uses **schema-first** approach with GraphQL SDL:

**Pros:**
- Designer/client teams can work independently
- Schema serves as contract between frontend/backend
- Better for API-first development
- Language-agnostic

**Code-first alternative:** See [Pothos](https://pothos-graphql.dev/) or [TypeGraphQL](https://typegraphql.com/)

### Resolver Organization

Resolvers are organized by domain entity:
- `user.resolver.ts` - User queries/mutations
- `post.resolver.ts` - Post CRUD
- `comment.resolver.ts` - Comment operations
- `auth.resolver.ts` - Authentication logic

Business logic is separated into services (`src/services/`).

### DataLoader Pattern

Automatic request-scoped batching and caching:
- Created fresh per-request via context
- Batches multiple `load()` calls into single query
- Caches results for request duration
- Prevents N+1 query problems

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](LICENSE) for details.
