# AGENTS.md - AI Agent Instructions

## @dcyfr/ai-graphql

**Template Type:** GraphQL API Server Starter  
**Stack:** Apollo Server 4, TypeScript 5.3+, Express 4, graphql-ws

---

## Architecture

Schema-first GraphQL API with layered architecture:

```
Schema (SDL) → Resolvers → Services → Data Store
                  ↕
              DataLoaders (N+1 prevention)
              Middleware (auth, rate-limit)
              Subscriptions (PubSub)
```

### Key Patterns

1. **Schema-First** - SDL files define the API contract, resolvers implement it
2. **Service Layer** - Business logic isolated from resolver plumbing
3. **DataLoader** - Batch loading for N+1 prevention
4. **Input Validation** - Zod schemas validate all mutation inputs
5. **Cursor Pagination** - Relay-style connections throughout

### Adding a New Type

1. Create SDL in `src/schema/typeDefs/<type>.ts`
2. Create resolver in `src/resolvers/<type>.resolver.ts`
3. Create service in `src/services/<type>.service.ts`
4. Add DataLoader in `src/dataloaders/index.ts`
5. Add to merged resolvers in `src/resolvers/index.ts`
6. Export typeDefs in `src/schema/typeDefs/index.ts`
7. Write tests in `tests/unit/resolvers/<type>.resolver.test.ts`

### Testing Strategy

- Unit tests use `graphql()` function directly (no HTTP server needed)
- Test utils in `tests/helpers/test-utils.ts` provide `executeQuery()` helper
- Each test gets fresh DataLoaders via `createTestContext()`

### Important Notes

- In-memory DB is a singleton - tests share state (be aware of ordering)
- Custom scalars (DateTime, JSON) are in `src/schema/scalars/`
- PubSub is in-memory - replace with Redis for production multi-instance
