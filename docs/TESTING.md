# GraphQL Testing Guide

Comprehensive guide to testing GraphQL APIs with Apollo Server using Vitest.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Setup](#setup)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Testing Subscriptions](#testing-subscriptions)
- [Mocking](#mocking)
- [Coverage](#coverage)

---

## Testing Strategy

### Testing Pyramid

```
        /\
       /E2E\          Few, slow, high confidence
      /------\
     / Integr.\       Some, moderate speed
    /----------\
   / Unit Tests \     Many, fast, focused
  /--------------\
```

**Distribution:**
- **Unit Tests:** 70% - Individual resolvers, services, utilities
- **Integration Tests:** 20% - Full GraphQL operations with test database
- **E2E Tests:** 10% - Real HTTP requests, actual database

---

## Setup

### Install Dependencies

```bash
npm install --save-dev vitest @vitest/coverage-v8 @apollo/server
```

### Test Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/*.d.ts'
      ]
    },
    setupFiles: ['./tests/setup.ts']
  }
});
```

**tests/setup.ts:**
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../src/lib/db';

beforeAll(async () => {
  // Setup test database
  await db.connect();
});

afterAll(async () => {
  // Cleanup
  await db.disconnect();
});

beforeEach(async () => {
  // Clear database before each test
  await db.clear();
});
```

---

## Unit Testing

### Testing Resolvers

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { postResolvers } from '../src/resolvers/post.resolver';
import { createTestContext } from './helpers/context';

describe('Post Resolvers', () => {
  let context: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    context = createTestContext();
  });

  describe('Query.post', () => {
    it('should fetch post by ID', async () => {
      const post = await context.db.post.create({
        data: {
          title: 'Test Post',
          content: 'Content here',
          authorId: 'user-1'
        }
      });

      const result = await postResolvers.Query.post(
        {},
        { id: post.id },
        context
      );

      expect(result).toEqual({
        id: post.id,
        title: 'Test Post',
        content: 'Content here',
        authorId: 'user-1'
      });
    });

    it('should return null for non-existent post', async () => {
      const result = await postResolvers.Query.post(
        {},
        { id: 'non-existent' },
        context
      );

      expect(result).toBeNull();
    });
  });

  describe('Mutation.createPost', () => {
    it('should create a new post', async () => {
      const input = {
        title: 'New Post',
        content: 'Content here',
        tags: ['test']
      };

      const result = await postResolvers.Mutation.createPost(
        {},
        { input },
        {
          ...context,
          user: { id: 'user-1', role: 'USER' }
        }
      );

      expect(result).toMatchObject({
        title: 'New Post',
        content: 'Content here',
        tags: ['test'],
        authorId: 'user-1'
      });
    });

    it('should throw error without authentication', async () => {
      const input = {
        title: 'New Post',
        content: 'Content here'
      };

      await expect(
        postResolvers.Mutation.createPost({}, { input }, context)
      ).rejects.toThrow('Authentication required');
    });

    it('should validate input', async () => {
      const input = {
        title: 'A', // Too short
        content: 'Content here'
      };

      await expect(
        postResolvers.Mutation.createPost(
          {},
          { input },
          {
            ...context,
            user: { id: 'user-1', role: 'USER' }
          }
        )
      ).rejects.toThrow('Title must be at least 3 characters');
    });
  });

  describe('Post.author', () => {
    it('should resolve author via DataLoader', async () => {
      const user = await context.db.user.create({
        data: { email: 'test@example.com', name: 'Test User' }
      });

      const post = { id: 'post-1', authorId: user.id };

      const result = await postResolvers.Post.author(post, {}, context);

      expect(result).toEqual({
        id: user.id,
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    it('should batch multiple author requests', async () => {
      const user = await context.db.user.create({
        data: { email: 'test@example.com', name: 'Test User' }
      });

      const posts = [
        { id: 'post-1', authorId: user.id },
        { id: 'post-2', authorId: user.id },
        { id: 'post-3', authorId: user.id }
      ];

      // Spy on DataLoader to verify batching
      const loadSpy = vi.spyOn(context.loaders.user, 'load');

      await Promise.all(
        posts.map(post => postResolvers.Post.author(post, {}, context))
      );

      // Should be called 3 times but only execute 1 database query
      expect(loadSpy).toHaveBeenCalledTimes(3);
    });
  });
});
```

### Testing Services

```typescript
import { describe, it, expect } from 'vitest';
import { PostService } from '../src/services/post.service';
import { createTestDb } from './helpers/db';

describe('PostService', () => {
  const db = createTestDb();
  const service = new PostService(db);

  describe('createPost', () => {
    it('should create post with valid input', async () => {
      const post = await service.createPost({
        title: 'Test Post',
        content: 'Content here',
        authorId: 'user-1',
        tags: ['test']
      });

      expect(post).toMatchObject({
        title: 'Test Post',
        content: 'Content here',
        tags: ['test'],
        published: false
      });
    });

    it('should publish post if specified', async () => {
      const post = await service.createPost({
        title: 'Published Post',
        content: 'Content',
        authorId: 'user-1',
        published: true
      });

      expect(post.published).toBe(true);
    });
  });

  describe('updatePost', () => {
    it('should update existing post', async () => {
      const post = await service.createPost({
        title: 'Original',
        content: 'Content',
        authorId: 'user-1'
      });

      const updated = await service.updatePost(post.id, {
        title: 'Updated',
        content: 'New content'
      });

      expect(updated.title).toBe('Updated');
      expect(updated.content).toBe('New content');
    });

    it('should throw error for non-existent post', async () => {
      await expect(
        service.updatePost('non-existent', { title: 'Updated' })
      ).rejects.toThrow('Post not found');
    });
  });
});
```

---

## Integration Testing

### Testing Full GraphQL Operations

```typescript
import { describe, it, expect } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/schema';
import { resolvers } from '../src/resolvers';
import { createTestContext } from './helpers/context';

describe('GraphQL Integration Tests', () => {
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  describe('Posts API', () => {
    it('should fetch all posts', async () => {
      const context = createTestContext();
      
      // Seed data
      await context.db.post.createMany({
        data: [
          { title: 'Post 1', content: 'Content 1', authorId: 'user-1' },
          { title: 'Post 2', content: 'Content 2', authorId: 'user-1' }
        ]
      });

      const response = await server.executeOperation({
        query: `
          query GetPosts {
            posts(first: 10) {
              edges {
                node {
                  id
                  title
                }
              }
              pageInfo {
                hasNextPage
              }
            }
          }
        `
      }, { contextValue: context });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.posts.edges).toHaveLength(2);
      }
    });

    it('should create post with authentication', async () => {
      const context = createTestContext({
        user: { id: 'user-1', role: 'USER' }
      });

      const response = await server.executeOperation({
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
              content
            }
          }
        `,
        variables: {
          input: {
            title: 'New Post',
            content: 'Lorem ipsum'
          }
        }
      }, { contextValue: context });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        expect(response.body.singleResult.data?.createPost).toMatchObject({
          title: 'New Post',
          content: 'Lorem ipsum'
        });
      }
    });

    it('should reject unauthenticated mutation', async () => {
      const context = createTestContext(); // No user

      const response = await server.executeOperation({
        query: `
          mutation CreatePost($input: CreatePostInput!) {
            createPost(input: $input) {
              id
              title
            }
          }
        `,
        variables: {
          input: {
            title: 'New Post',
            content: 'Lorem ipsum'
          }
        }
      }, { contextValue: context });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('Authentication required');
      }
    });
  });

  describe('Nested Resolvers', () => {
    it('should resolve nested author', async () => {
      const context = createTestContext();
      
      const user = await context.db.user.create({
        data: { email: 'author@example.com', name: 'John Doe' }
      });

      await context.db.post.create({
        data: { title: 'Test', content: 'Content', authorId: user.id }
      });

      const response = await server.executeOperation({
        query: `
          query {
            posts(first: 1) {
              edges {
                node {
                  title
                  author {
                    name
                    email
                  }
                }
              }
            }
          }
        `
      }, { contextValue: context });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        const post = response.body.singleResult.data?.posts.edges[0].node;
        expect(post.author).toEqual({
          name: 'John Doe',
          email: 'author@example.com'
        });
      }
    });
  });
});
```

---

## End-to-End Testing

### HTTP Request Testing

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startServer } from '../src/server';
import type { Server } from 'http';

describe('E2E Tests', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    const result = await startServer();
    server = result.server;
    port = result.port;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('should handle GraphQL queries over HTTP', async () => {
    const response = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            health {
              status
              version
            }
          }
        `
      })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.errors).toBeUndefined();
    expect(data.data.health.status).toBe('ok');
  });

  it('should handle authentication', async () => {
    // Register user
    const registerRes = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation {
            register(input: {
              email: "test@example.com"
              password: "password123"
              name: "Test User"
            }) {
              token
              user {
                email
              }
            }
          }
        `
      })
    });

    const registerData = await registerRes.json();
    const token = registerData.data.register.token;

    // Use token for authenticated request
    const meRes = await fetch(`http://localhost:${port}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              email
              name
            }
          }
        `
      })
    });

    const meData = await meRes.json();
    expect(meData.data.me.email).toBe('test@example.com');
  });
});
```

---

## Testing Subscriptions

### Setup

```bash
npm install --save-dev graphql-ws ws
```

### Subscription Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { startServer } from '../src/server';

describe('Subscription Tests', () => {
  let server: any;
  let wsUrl: string;

  beforeAll(async () => {
    const result = await startServer();
    server = result.server;
    wsUrl = `ws://localhost:${result.port}/graphql`;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  it('should receive subscription updates', async () => {
    const ws = new WebSocket(wsUrl, 'graphql-transport-ws');

    await new Promise(resolve => ws.on('open', resolve));

    // Subscribe
    ws.send(JSON.stringify({
      type: 'connection_init'
    }));

    ws.send(JSON.stringify({
      id: '1',
      type: 'subscribe',
      payload: {
        query: `
          subscription {
            postCreated {
              id
              title
            }
          }
        `
      }
    }));

    const messages: any[] = [];
    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    // Trigger event
    await fetch(`http://localhost:${server.port}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        query: `
          mutation {
            createPost(input: { title: "Test", content: "Content" }) {
              id
            }
          }
        `
      })
    });

    // Wait for subscription message
    await new Promise(resolve => setTimeout(resolve, 100));

    const dataMessage = messages.find(m => m.type === 'next');
    expect(dataMessage).toBeDefined();
    expect(dataMessage.payload.data.postCreated.title).toBe('Test');

    ws.close();
  });
});
```

---

## Mocking

### Mock DataLoaders

```typescript
import { vi } from 'vitest';
import DataLoader from 'dataloader';

export function createMockLoaders() {
  return {
    user: new DataLoader(async (ids) => {
      return ids.map(id => ({
        id,
        email: `user-${id}@example.com`,
        name: `User ${id}`
      }));
    }),
    post: new DataLoader(async (ids) => {
      return ids.map(id => ({
        id,
        title: `Post ${id}`,
        authorId: 'user-1'
      }));
    })
  };
}
```

### Mock Context

```typescript
export function createTestContext(overrides = {}) {
  return {
    user: null,
    req: {} as any,
    db: createTestDb(),
    loaders: createMockLoaders(),
    ...overrides
  };
}
```

### Mock External Services

```typescript
import { vi } from 'vitest';

vi.mock('../src/services/email.service', () => ({
  EmailService: class {
    async send() {
      return { success: true };
    }
  }
}));
```

---

## Coverage

### Run Coverage

```bash
npm run test:coverage
```

### Coverage Thresholds

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html','lcov'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.config.ts'
      ]
    }
  }
});
```

### View Coverage Report

```bash
open coverage/index.html
```

---

## Testing Checklist

- [ ] **Unit tests** for all resolvers
- [ ] **Service layer** tests
- [ ] **Integration tests** for complex queries/mutations
- [ ] **Authentication/authorization** tests
- [ ] **Input validation** tests
- [ ] **Error handling** tests
- [ ] **Subscription** tests (if using subscriptions)
- [ ] **DataLoader batching** verification
- [ ] **E2E tests** for critical workflows
- [ ] **Coverage ≥80%** across all categories

---

## Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **One assertion per test** (when possible)
4. **Clean up test data** between tests
5. **Mock external dependencies**
6. **Test error cases**
7. **Maintain test isolation**
8. **Keep tests fast**

---

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Apollo Server Testing](https://www.apollographql.com/docs/apollo-server/testing/testing/)
- [GraphQL Testing Best Practices](https://www.apollographql.com/blog/testing-apollo-server)

