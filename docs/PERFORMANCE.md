# GraphQL Performance Optimization

Comprehensive guide to optimizing GraphQL API performance with Apollo Server.

## Table of Contents

- [N+1 Problem](#n1-problem)
- [DataLoader Pattern](#dataloader-pattern)
- [Query Complexity](#query-complexity)
- [Caching Strategies](#caching-strategies)
- [Database Optimization](#database-optimization)
- [Response Compression](#response-compression)
- [Performance Monitoring](#performance-monitoring)
- [Load Testing](#load-testing)

---

## N+1 Problem

### The Problem

When fetching collections with related data, each item in the collection triggers a separate database query, resulting in N+1 total queries.

**Bad Example:**
```graphql
query {
  posts {           # 1 query
    id
    title
    author {        # N queries (one per post)
      id
      name
    }
  }
}
```

**Result:** 1 + 100 = 101 queries for 100 posts!

### Detection

Enable query logging to identify N+1 patterns:

```typescript
// In your database client
const db = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
});

db.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## DataLoader Pattern

### Implementation

DataLoader batches and caches database requests within a single GraphQL operation.

**Install:**
```bash
npm install dataloader
```

**Create UserLoader:**
```typescript
import DataLoader from 'dataloader';
import { db } from './db';

export function createUserLoader() {
  return new DataLoader<string, User>(async (userIds) => {
    console.log(`Batching ${userIds.length} user queries`);
    
    // Single database query for all IDs
    const users = await db.user.findMany({
      where: {
        id: {
          in: userIds as string[]
        }
      }
    });
    
    // Create a map for O(1) lookup
    const userMap = new Map(users.map(u => [u.id, u]));
    
    // Return users in the same order as requested IDs
    return userIds.map(id => userMap.get(id) || new Error(`User ${id} not found`));
  });
}
```

**Context Setup:**
```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

app.use('/graphql', expressMiddleware(server, {
  context: async ({ req }) => {
    return {
      req,
      loaders: {
        user: createUserLoader(),
        post: createPostLoader(),
        comment: createCommentLoader(),
      }
    };
  }
}));
```

**Use in Resolvers:**
```typescript
const resolvers = {
  Post: {
    author: (post, _, { loaders }) => {
      // DataLoader batches + caches this
      return loaders.user.load(post.authorId);
    }
  },
  
  Comment: {
    author: (comment, _, { loaders }) => {
      return loaders.user.load(comment.authorId);
    }
  }
};
```

### Advanced DataLoader Patterns

**Composite Keys:**
```typescript
const postsByAuthorLoader = new DataLoader<string, Post[]>(async (authorIds) => {
  const posts = await db.post.findMany({
    where: {
      authorId: {
        in: authorIds as string[]
      }
    }
  });
  
  const postsByAuthor = new Map<string, Post[]>();
  posts.forEach(post => {
    if (!postsByAuthor.has(post.authorId)) {
      postsByAuthor.set(post.authorId, []);
    }
    postsByAuthor.get(post.authorId)!.push(post);
  });
  
  return authorIds.map(id => postsByAuthor.get(id) || []);
});
```

**Caching with TTL:**
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5 // 5 minutes
});

const userLoader = new DataLoader<string, User>(
  async (ids) => { /* ... */ },
  {
    cacheMap: cache
  }
);
```

---

## Query Complexity

### Calculating Complexity

```bash
npm install graphql-query-complexity
```

```typescript
import { createComplexityRule, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      variables: {},
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: 1 })
      ],
      onComplete: (complexity) => {
        console.log('Query Complexity:', complexity);
      }
    })
  ]
});
```

### Schema Complexity Annotations

```graphql
type Query {
  simpleQuery: String @complexity(value: 1)
  
  expensiveQuery: [Item!]! @complexity(
    value: 10
    multipliers: ["first"]
  )
  
  posts(first: Int!): [Post!]! @complexity(
    value: 1,
    multipliers: ["first"]
  )
}
```

**Complexity Calculation:**
- `simpleQuery`: 1
- `posts(first: 100)`: 1 × 100 = 100
- Nested fields multiply: `posts.author.posts`: 100 × 1 × 100 = 10,000

### Dynamic Complexity

```typescript
const resolvers = {
  Query: {
    posts: {
      complexity: ({ args }) => {
        return args.first * 10; // Higher cost for larger page sizes
      },
      resolve: async (_, { first }) => {
        return await fetchPosts(first);
      }
    }
  }
};
```

---

## Caching Strategies

### 1. In-Memory Caching

**Apollo Server Response Cache:**
```bash
npm install @apollo/server-plugin-response-cache
```

```typescript
import responseCachePlugin from '@apollo/server-plugin-response-cache';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    responseCachePlugin({
      sessionId: (ctx) => {
        // Only cache unauthenticated requests
        return ctx.req.headers.authorization ? null : 'public';
      },
      shouldReadFromCache: (ctx) => {
        // Don't cache mutations
        return ctx.request.http?.method === 'GET';
      }
    })
  ]
});
```

**Field-Level Cache Hints:**
```graphql
type Query {
  publicPosts: [Post!]! @cacheControl(maxAge: 60)
  user(id: ID!): User @cacheControl(maxAge: 30)
}

type Post {
  id: ID!
  title: String! @cacheControl(maxAge: 60)
  author: User! @cacheControl(maxAge: 30)
}
```

### 2. Redis Caching

```bash
npm install redis
```

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

await redisClient.connect();

const resolvers = {
  Query: {
    post: async (_, { id }) => {
      const cacheKey = `post:${id}`;
      
      // Try cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('Cache hit for', cacheKey);
        return JSON.parse(cached);
      }
      
      // Fetch from database
      const post = await db.post.findUnique({ where: { id } });
      
      // Store in cache (TTL: 5 minutes)
      await redisClient.setEx(cacheKey, 300, JSON.stringify(post));
      
      return post;
    }
  }
};
```

### 3. HTTP Caching

```typescript
app.use('/graphql', expressMiddleware(server, {
  context: async ({ req, res }) => {
    // Set Cache-Control headers for GET requests
    if (req.method === 'GET') {
      res.set('Cache-Control', 'public, max-age=60');
    }
    
    return { req, res };
  }
}));
```

### 4. CDN Caching

Use persisted queries with a CDN like Cloudflare or Fastly:

```typescript
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    ttl: 900 // 15 minutes
  },
  plugins: [
    ApolloServerPluginCacheControl({
      defaultMaxAge: 5,
      calculateHttpHeaders: true
    })
  ]
});
```

---

## Database Optimization

### 1. Indexes

Ensure proper database indexes:

```sql
-- Index foreign keys
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Index query filters
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Composite indexes
CREATE INDEX idx_posts_author_published ON posts(author_id, published);
```

### 2. Select Only Needed Fields

**Bad:**
```typescript
const resolvers = {
  Query: {
    posts: () => {
      // Fetches ALL columns
      return db.post.findMany();
    }
  }
};
```

**Good:**
```typescript
const resolvers = {
  Query: {
    posts: (_, __, info) => {
      const fields = getRequestedFields(info);
      
      return db.post.findMany({
        select: {
          id: fields.includes('id'),
          title: fields.includes('title'),
          content: fields.includes('content'),
          // Only fetch author if requested
          author: fields.includes('author') ? {
            select: { id: true, name: true }
          } : false
        }
      });
    }
  }
};
```

### 3. Pagination

Always paginate large collections:

**Cursor-Based:**
```graphql
type Query {
  posts(first: Int!, after: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}
```

```typescript
const resolvers = {
  Query: {
    posts: async (_, { first = 20, after }) => {
      const posts = await db.post.findMany({
        take: first + 1, // Fetch one extra to check hasNextPage
        cursor: after ? { id: after } : undefined,
        orderBy: { createdAt: 'desc' }
      });
      
      const hasNextPage = posts.length > first;
      const edges = posts.slice(0, first);
      
      return {
        edges: edges.map(post => ({ cursor: post.id, node: post })),
        pageInfo: {
          hasNextPage,
          endCursor: edges[edges.length - 1]?.id || null
        }
      };
    }
  }
};
```

### 4. Batch Database Queries

```typescript
// Bad: Sequential queries
const posts = await db.post.findMany();
const users = await db.user.findMany();
const comments = await db.comment.findMany();

// Good: Parallel queries
const [posts, users, comments] = await Promise.all([
  db.post.findMany(),
  db.user.findMany(),
  db.comment.findMany()
]);
```

---

## Response Compression

### Enable GZIP

```bash
npm install compression
```

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Compression level (0-9)
}));
```

### Brotli Compression

```bash
npm install shrink-ray-current
```

```typescript
import shrinkRay from 'shrink-ray-current';

app.use(shrinkRay());
```

---

## Performance Monitoring

### Apollo Studio

```typescript
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginUsageReporting({
      sendVariableValues: { none: true },
      sendHeaders: { none: true },
      sendErrors: { masked: true }
    })
  ]
});
```

### Custom Performance Tracking

```typescript
const performancePlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const start = Date.now();
    let dbTime = 0;
    
    return {
      async executionDidStart() {
        return {
          willResolveField({ info }) {
            const fieldStart = Date.now();
            
            return () => {
              const fieldDuration = Date.now() - fieldStart;
              if (fieldDuration > 100) {
                console.warn(`Slow field: ${info.parentType}.${info.fieldName} took ${fieldDuration}ms`);
              }
            };
          }
        };
      },
      
      async willSendResponse({ response }) {
        const duration = Date.now() - start;
        
        console.log({
          duration: `${duration}ms`,
          cacheHit: response.http?.headers.get('x-cache-hit') === 'true',
          errors: response.errors?.length || 0
        });
      }
    };
  }
};
```

### Query Performance Metrics

```typescript
import promClient from 'prom-client';

const queryDuration = new promClient.Histogram({
  name: 'graphql_query_duration_seconds',
  help: 'GraphQL query duration',
  labelNames: ['operation', 'status']
});

const queryCounter = new promClient.Counter({
  name: 'graphql_queries_total',
  help: 'Total GraphQL queries',
  labelNames: ['operation', 'status']
});
```

---

## Load Testing

### Artillery

```bash
npm install -g artillery
```

**artillery-config.yml:**
```yaml
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"
scenarios:
  - name: "Fetch posts"
    engine: graphql
    flow:
      - post:
          url: "/graphql"
          json:
            query: |
              query {
                posts(first: 20) {
                  edges {
                    node {
                      id
                      title
                      author {
                        name
                      }
                    }
                  }
                }
              }
```

**Run test:**
```bash
artillery run artillery-config.yml
```

### k6

```bash
brew install k6
```

**load-test.js:**
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

export default function () {
  const query = `
    query {
      posts(first: 20) {
        edges {
          node {
            id
            title
            author { name }
          }
        }
      }
    }
  `;

  const res = http.post('http://localhost:4000/graphql', JSON.stringify({
    query
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'no errors': (r) => !JSON.parse(r.body).errors,
  });
}
```

**Run test:**
```bash
k6 run load-test.js
```

---

## Performance Checklist

- [ ] **DataLoader implemented** for all relationships
- [ ] **Query complexity limiting** enabled
- [ ] **Depth limiting** (max 5-7 levels)
- [ ] **Response caching** configured
- [ ] **Database indexes** on foreign keys and filters
- [ ] **Pagination** for all collections
- [ ] **Compression** enabled (gzip/brotli)
- [ ] **Field selection** optimization
- [ ] **Rate limiting** implemented
- [ ] **Monitoring** with Apollo Studio or custom metrics
- [ ] **Load testing** performed

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **P50 Response Time** | <100ms | 50th percentile |
| **P95 Response Time** | <500ms | 95th percentile |
| **P99 Response Time** | <1000ms | 99th percentile |
| **Error Rate** | <0.1% | Percentage of failed requests |
| **Throughput** | >1000 req/s | Requests per second |
| **Max Query Complexity** | <1000 | Complexity score |
| **Max Query Depth** | 5-7 | Number of nested levels |

---

## Further Reading

- [Apollo Performance Guide](https://www.apollographql.com/docs/apollo-server/performance/apq/)
- [DataLoader Documentation](https://github.com/graphql/dataloader)
- [GraphQL Best Practices - Performance](https://graphql.org/learn/best-practices/#server-side-batching-caching)
- [Optimizing GraphQL Performance](https://www.howtographql.com/advanced/5-performance/)

