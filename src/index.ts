/**
 * @dcyfr/ai-graphql - GraphQL API Server Template
 *
 * Apollo Server 4 with schema-first design, type-safe resolvers,
 * DataLoader pattern, subscriptions, JWT auth, and rate limiting.
 */

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import express from 'express';
import cors from 'cors';
import http from 'node:http';

import { typeDefs } from './schema/typeDefs/index.js';
import { resolvers } from './resolvers/index.js';
import { loadConfig } from './config/env.js';
import { createDataLoaders } from './dataloaders/index.js';
import { extractUser } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rate-limit.js';
import { logOperation, startTimer } from './middleware/logging.js';
import type { GraphQLContext } from './lib/types.js';

/**
 * Start the GraphQL server
 */
export async function startServer() {
  const config = loadConfig();
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Create Express app and HTTP server
  const app = express();
  const httpServer = http.createServer(app);

  // WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer(
    {
      schema,
      context: async () => {
        const loaders = createDataLoaders(config);
        return {
          user: null,
          loaders,
          config,
          request: { ip: 'ws', userAgent: 'ws-client' },
        } satisfies GraphQLContext;
      },
    },
    wsServer
  );

  // Rate limiter
  const rateLimiter = createRateLimiter({
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests,
  });

  // Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema,
    plugins: [
      // Drain HTTP server on shutdown
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Drain WebSocket server on shutdown
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  // Express middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
    }),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }): Promise<GraphQLContext> => {
        const timer = startTimer();
        const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress ?? 'unknown';
        const userAgent = req.headers['user-agent'] ?? 'unknown';

        // Rate limiting
        if (!rateLimiter.check(ip)) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        // Extract authenticated user
        const user = extractUser(
          { authorization: req.headers.authorization },
          config
        );

        // Create fresh data loaders per request
        const loaders = createDataLoaders(config);

        // Log operation
        const duration = timer();
        logOperation({
          timestamp: new Date().toISOString(),
          operation: req.body?.operationName ?? null,
          duration,
          ip,
          userId: user?.id,
        });

        return {
          user,
          loaders,
          config,
          request: { ip, userAgent },
        };
      },
    })
  );

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start listening
  await new Promise<void>((resolve) => {
    httpServer.listen({ port: config.port }, resolve);
  });

  console.log(`
🚀 GraphQL Server ready!
   HTTP:      http://localhost:${config.port}/graphql
   WebSocket: ws://localhost:${config.port}/graphql
   Health:    http://localhost:${config.port}/health
  `);

  return { server, httpServer, wsServer };
}

// Start server when run directly
startServer().catch(console.error);
