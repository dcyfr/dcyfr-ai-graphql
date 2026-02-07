/**
 * Custom GraphQL Directives Example
 * 
 * Demonstrates:
 * - @auth directive for field-level authorization
 * - @deprecated directive (built-in) usage
 * - @rateLimit directive for API protection
 * - @cache directive for response caching
 * - @uppercase and @lowercase directives for transformations
 * - @computed directive for derived fields
 * - Directive composition
 * 
 * Custom directives provide declarative metadata for schema fields.
 */

import { GraphQLError } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver } from 'graphql';

// ============================================================================
// @auth Directive - Field-Level Authorization
// ============================================================================

/**
 * Directive definition in schema:
 * 
 * directive @auth(
 *   requires: Role = USER
 * ) on FIELD_DEFINITION | OBJECT
 * 
 * enum Role {
 *   USER
 *   ADMIN
 *   SUPER_ADMIN
 * }
 */

function authDirective(directiveName: string) {
  return (schema: any) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
        
        if (authDirective) {
          const { requires } = authDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;
          
          fieldConfig.resolve = async function (source, args, context, info) {
            // Check if user is authenticated
            if (!context.currentUser) {
              throw new GraphQLError('You must be logged in', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }
            
            // Check if user has required role
            const userRole = context.currentUser.role;
            const requiredRole = requires || 'USER';
            
            const roleHierarchy = ['USER', 'ADMIN', 'SUPER_ADMIN'];
            const userRoleIndex = roleHierarchy.indexOf(userRole);
            const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
            
            if (userRoleIndex < requiredRoleIndex) {
              throw new GraphQLError(
                `You need ${requiredRole} role to access this field`,
                { extensions: { code: 'FORBIDDEN' } }
              );
            }
            
            return resolve(source, args, context, info);
          };
        }
        
        return fieldConfig;
      },
    });
}

/**
 * Usage in schema:
 * 
 * type User {
 *   id: ID!
 *   name: String!
 *   email: String! @auth(requires: USER)
 *   salary: Float @auth(requires: ADMIN)
 *   internalNotes: String @auth(requires: SUPER_ADMIN)
 * }
 */

// ============================================================================
// @rateLimit Directive - API Protection
// ============================================================================

/**
 * Directive definition:
 * 
 * directive @rateLimit(
 *   limit: Int = 100
 *   window: Int = 60
 * ) on FIELD_DEFINITION
 */

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimitDirective(directiveName: string) {
  return (schema: any) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const rateLimitDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
        
        if (rateLimitDirective) {
          const { limit = 100, window = 60 } = rateLimitDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;
          
          fieldConfig.resolve = async function (source, args, context, info) {
            // Create rate limit key (user ID or IP)
            const userId = context.currentUser?.id || context.request.ip;
            const key = `${info.parentType.name}.${info.fieldName}:${userId}`;
            
            const now = Date.now();
            const existing = rateLimitStore.get(key);
            
            if (!existing || existing.resetAt < now) {
              // New window
              rateLimitStore.set(key, {
                count: 1,
                resetAt: now + window * 1000,
              });
            } else {
              // Increment counter
              existing.count += 1;
              
              if (existing.count > limit) {
                throw new GraphQLError(
                  `Rate limit exceeded. Try again in ${Math.ceil((existing.resetAt - now) / 1000)}s`,
                  { extensions: { code: 'RATE_LIMIT_EXCEEDED' } }
                );
              }
            }
            
            return resolve(source, args, context, info);
          };
        }
        
        return fieldConfig;
      },
    });
}

/**
 * Usage in schema:
 * 
 * type Query {
 *   search(query: String!): [Post!]! @rateLimit(limit: 10, window: 60)
 *   expensiveReport: Report @rateLimit(limit: 5, window: 3600)
 * }
 */

// ============================================================================
// @cache Directive - Response Caching
// ============================================================================

/**
 * Directive definition:
 * 
 * directive @cache(
 *   ttl: Int = 60
 *   scope: CacheScope = PUBLIC
 * ) on FIELD_DEFINITION
 * 
 * enum CacheScope {
 *   PUBLIC
 *   PRIVATE
 * }
 */

const cacheStore = new Map<string, { value: any; expiresAt: number }>();

function cacheDirective(directiveName: string) {
  return (schema: any) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const cacheDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
        
        if (cacheDirective) {
          const { ttl = 60, scope = 'PUBLIC' } = cacheDirective;
          const { resolve = defaultFieldResolver } = fieldConfig;
          
          fieldConfig.resolve = async function (source, args, context, info) {
            // Create cache key
            let key = `${info.parentType.name}.${info.fieldName}:${JSON.stringify(args)}`;
            
            if (scope === 'PRIVATE') {
              key += `:${context.currentUser?.id}`;
            }
            
            // Check cache
            const cached = cacheStore.get(key);
            const now = Date.now();
            
            if (cached && cached.expiresAt > now) {
              console.log(`[Cache HIT] ${key}`);
              return cached.value;
            }
            
            // Cache miss - resolve and cache
            console.log(`[Cache MISS] ${key}`);
            const result = await resolve(source, args, context, info);
            
            cacheStore.set(key, {
              value: result,
              expiresAt: now + ttl * 1000,
            });
            
            return result;
          };
        }
        
        return fieldConfig;
      },
    });
}

/**
 * Usage in schema:
 * 
 * type Query {
 *   latestPosts: [Post!]! @cache(ttl: 300, scope: PUBLIC)
 *   myNotifications: [Notification!]! @cache(ttl: 60, scope: PRIVATE)
 * }
 */

// ============================================================================
// @uppercase and @lowercase Directives - Transformations
// ============================================================================

/**
 * Directive definitions:
 * 
 * directive @uppercase on FIELD_DEFINITION
 * directive @lowercase on FIELD_DEFINITION
 */

function uppercaseDirective(directiveName: string) {
  return (schema: any) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const uppercaseDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
        
        if (uppercaseDirective) {
          const { resolve = defaultFieldResolver } = fieldConfig;
          
          fieldConfig.resolve = async function (source, args, context, info) {
            const result = await resolve(source, args, context, info);
            
            if (typeof result === 'string') {
              return result.toUpperCase();
            }
            
            return result;
          };
        }
        
        return fieldConfig;
      },
    });
}

function lowercaseDirective(directiveName: string) {
  return (schema: any) =>
    mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const lowercaseDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
        
        if (lowercaseDirective) {
          const { resolve = defaultFieldResolver } = fieldConfig;
          
          fieldConfig.resolve = async function (source, args, context, info) {
            const result = await resolve(source, args, context, info);
            
            if (typeof result === 'string') {
              return result.toLowerCase();
            }
            
            return result;
          };
        }
        
        return fieldConfig;
      },
    });
}

/**
 * Usage in schema:
 * 
 * type User {
 *   name: String!
 *   username: String! @lowercase
 *   displayName: String! @uppercase
 * }
 */

// ============================================================================
// @deprecated Directive (Built-in)
// ============================================================================

/**
 * Built-in GraphQL directive for deprecation warnings
 * 
 * Usage in schema:
 * 
 * type User {
 *   oldField: String @deprecated(reason: "Use newField instead")
 *   newField: String
 * }
 * 
 * GraphQL clients will show warnings when using deprecated fields.
 * No custom implementation needed - handled by GraphQL.js automatically.
 */

// ============================================================================
// @length Directive - Validation
// ============================================================================

/**
 * Directive definition:
 * 
 * directive @length(
 *   min: Int
 *   max: Int
 * ) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION
 */

function lengthDirective(directiveName: string) {
  return (schema: any) =>
    mapSchema(schema, {
      [MapperKind.INPUT_OBJECT_FIELD]: (inputFieldConfig) => {
        const lengthDirective = getDirective(schema, inputFieldConfig, directiveName)?.[0];
        
        if (lengthDirective) {
          const { min, max } = lengthDirective;
          // Validation happens during input object processing
          // This is a simplified example - full implementation would use validators
        }
        
        return inputFieldConfig;
      },
    });
}

/**
 * Usage in schema:
 * 
 * input CreateUserInput {
 *   username: String! @length(min: 3, max: 20)
 *   password: String! @length(min: 8)
 *   bio: String @length(max: 500)
 * }
 */

// ============================================================================
// Full Schema Example with Directives
// ============================================================================

export const schemaWithDirectives = `
  # Directive definitions
  directive @auth(requires: Role = USER) on FIELD_DEFINITION | OBJECT
  directive @rateLimit(limit: Int = 100, window: Int = 60) on FIELD_DEFINITION
  directive @cache(ttl: Int = 60, scope: CacheScope = PUBLIC) on FIELD_DEFINITION
  directive @uppercase on FIELD_DEFINITION
  directive @lowercase on FIELD_DEFINITION
  directive @length(min: Int, max: Int) on INPUT_FIELD_DEFINITION | ARGUMENT_DEFINITION

  enum Role {
    USER
    ADMIN
    SUPER_ADMIN
  }

  enum CacheScope {
    PUBLIC
    PRIVATE
  }

  type User {
    id: ID!
    name: String!
    username: String! @lowercase
    email: String! @auth(requires: USER)
    
    # Admin-only fields
    role: Role! @auth(requires: ADMIN)
    salary: Float @auth(requires: ADMIN)
    internalNotes: String @auth(requires: SUPER_ADMIN)
    
    # Deprecated field
    oldUsername: String @deprecated(reason: "Use username field instead")
  }

  type Post {
    id: ID!
    title: String!
    slug: String! @lowercase
    content: String!
  }

  type Query {
    # Cached queries
    latestPosts(limit: Int = 10): [Post!]! @cache(ttl: 300, scope: PUBLIC)
    
    # Rate-limited queries
    search(query: String!): [Post!]! @rateLimit(limit: 10, window: 60)
    
    # Protected queries
    me: User @auth(requires: USER)
    allUsers: [User!]! @auth(requires: ADMIN)
  }

  input CreateUserInput {
    username: String! @length(min: 3, max: 20)
    password: String! @length(min: 8)
    email: String!
    bio: String @length(max: 500)
  }

  type Mutation {
    createUser(input: CreateUserInput!): User @rateLimit(limit: 5, window: 3600)
    updateUser(id: ID!, input: UpdateUserInput!): User @auth(requires: USER)
    deleteUser(id: ID!): Boolean @auth(requires: ADMIN)
  }
`;

// ============================================================================
// Apply Directives to Schema
// ============================================================================

import { makeExecutableSchema } from '@graphql-tools/schema';

export function createSchemaWithDirectives(typeDefs: string, resolvers: any) {
  let schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Apply directives in order
  schema = authDirective('auth')(schema);
  schema = rateLimitDirective('rateLimit')(schema);
  schema = cacheDirective('cache')(schema);
  schema = uppercaseDirective('uppercase')(schema);
  schema = lowercaseDirective('lowercase')(schema);

  return schema;
}

/**
 * Usage:
 * 
 * import { ApolloServer } from '@apollo/server';
 * import { createSchemaWithDirectives, schemaWithDirectives } from './directives';
 * import { resolvers } from './resolvers';
 * 
 * const schema = createSchemaWithDirectives(schemaWithDirectives, resolvers);
 * 
 * const server = new ApolloServer({
 *   schema,
 * });
 */

/**
 * Key Concepts:
 * 
 * 1. Schema Directives
 *    - Declarative metadata for fields
 *    - Applied via @directiveName syntax
 *    - Can take arguments
 * 
 * 2. Directive Locations
 *    - FIELD_DEFINITION - type fields
 *    - OBJECT - entire types
 *    - INPUT_FIELD_DEFINITION - input type fields
 *    - ARGUMENT_DEFINITION - field arguments
 * 
 * 3. Directive Implementation
 *    - Use @graphql-tools/utils for schema transformation
 *    - Wrap resolve functions
 *    - Add logic before/after resolution
 * 
 * 4. Common Use Cases
 *    - Authorization (@auth)
 *    - Rate limiting (@rateLimit)
 *    - Caching (@cache)
 *    - Transformations (@uppercase, @lowercase)
 *    - Validation (@length, @range)
 *    - Deprecation (@deprecated - built-in)
 * 
 * 5. Directive Composition
 *    - Multiple directives on one field
 *    - Applied in order
 *    - Example: @auth(requires: USER) @cache(ttl: 60)
 * 
 * 6. Performance Considerations
 *    - Directives add overhead to each field resolution
 *    - Use caching to minimize repeated work
 *    - Consider directive order for efficiency
 */
