# GraphQL Deployment Guide

Comprehensive guide to deploying Apollo Server GraphQL APIs in production environments.

## Table of Contents

- [Deployment Platforms](#deployment-platforms)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Serverless Deployment](#serverless-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring & Observability](#monitoring--observability)
- [Performance Optimization](#performance-optimization)
- [Security Hardening](#security-hardening)

---

## Deployment Platforms

### Platform Comparison

| Platform | Best For | Scaling | Cost |
|----------|----------|---------|------|
| **Docker + PM2** | VPS, dedicated servers | Manual/horizontal | Low |
| **Kubernetes** | Enterprise, microservices | Auto-scaling | Medium |
|**AWS Lambda** | Serverless, variable traffic | Auto-scaling | Pay-per-use |
| **Railway** | Quick deploy, prototypes | Auto-scaling | Medium |
| **Render** | Hobby projects | Auto-scaling | Low-medium |
| **Fly.io** | Edge deployment | Auto-scaling | Medium |

---

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for optimized image
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  graphql:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=graphql_db
      - POSTGRES_USER=graphql_user
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Build and Run

```bash
# Build image
docker build -t my-graphql-api .

# Run container
docker run -d \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret \
  --name graphql-api \
  my-graphql-api

# With docker-compose
docker-compose up -d

# View logs
docker logs -f graphql-api

# Stop
docker-compose down
```

---

## Kubernetes Deployment

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-api
  labels:
    app: graphql-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphql-api
  template:
    metadata:
      labels:
        app: graphql-api
    spec:
      containers:
      - name: graphql-api
        image: your-registry/graphql-api:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "4000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: graphql-secrets
              key: jwt-secret
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: graphql-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 45
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: graphql-api-service
spec:
  type: LoadBalancer
  selector:
    app: graphql-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 4000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: graphql-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: graphql-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### secrets.yaml

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: graphql-secrets
type: Opaque
stringData:
  jwt-secret: your-jwt-secret-here
  database-url: postgresql://user:password@postgres:5432/dbname
```

### Deploy to Kubernetes

```bash
# Apply secrets
kubectl apply -f secrets.yaml

# Deploy application
kubectl apply -f deployment.yaml

# Check status
kubectl get pods
kubectl get svc

# View logs
kubectl logs -f deployment/graphql-api

# Scale manually
kubectl scale deployment graphql-api --replicas=5
```

---

## Serverless Deployment

### AWS Lambda + API Gateway

**Install dependencies:**
```bash
npm install serverless-http @apollo/server-integration-next
```

**lambda.ts:**
```typescript
import { ApolloServer } from '@apollo/server';
import { startServerAndCreateLambdaHandler } from '@aws-lambda-powertools/v4';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production'
});

export const handler = startServerAndCreateLambdaHandler(server);
```

**serverless.yml:**
```yaml
service: graphql-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    JWT_SECRET: ${env:JWT_SECRET}
    DATABASE_URL: ${env:DATABASE_URL}

functions:
  graphql:
    handler: dist/lambda.handler
    events:
      - http:
          path: graphql
          method: ANY
          cors: true
    timeout: 30
    memorySize: 1024

plugins:
  - serverless-offline
  - serverless-plugin-typescript
```

**Deploy:**
```bash
npx serverless deploy
```

---

## Production Checklist

### Environment Variables

```bash
# Required
NODE_ENV=production
PORT=4000

# Security
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Redis (for rate limiting, caching, PubSub)
REDIS_URL=redis://localhost:6379

# Monitoring
APOLLO_KEY=<apollo-studio-api-key>
APOLLO_GRAPH_REF=<graph-id>@<variant>

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com
```

### Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.apollographql.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.apollographql.com"],
      imgSrc: ["'self'", "data:", "cdn.apollographql.com"],
      connectSrc: ["'self'", "*.apollographql.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
```

### CORS Configuration

```typescript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  cache: 'bounded',
  plugins: [
    ApolloServerPluginLandingPageDisabled()
  ]
});

await server.start();

app.use(
  '/graphql',
  cors({
    origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
    credentials: true
  }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({ req })
  })
);
```

---

## Monitoring & Observability

### Apollo Studio Integration

```typescript
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginUsageReporting({
      sendVariableValues: { none: true },
      sendHeaders: { none: true }
    })
  ]
});
```

### Custom Logging Plugin

```typescript
import { ApolloServerPlugin } from '@apollo/server';

const loggingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const start = Date.now();
    
    return {
      async didEncounterErrors(ctx) {
        console.error('GraphQL Errors:', {
          query: ctx.request.query,
          variables: ctx.request.variables,
          errors: ctx.errors
        });
      },
      
      async willSendResponse(ctx) {
        const duration = Date.now() - start;
        console.log('GraphQL Request:', {
          operation: ctx.request.operationName,
          duration: `${duration}ms`,
          errors: ctx.errors?.length || 0
        });
      }
    };
  }
};
```

### Prometheus Metrics

```bash
npm install prom-client
```

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Performance Optimization

### 1. Enable Response Caching

```typescript
import responseCachePlugin from '@apollo/server-plugin-response-cache';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    responseCachePlugin({
      sessionId: (ctx) => ctx.req.headers.authorization || null
    })
  ]
});
```

### 2. DataLoader for N+1 Prevention

```typescript
import DataLoader from 'dataloader';

const userLoader = new DataLoader(async (ids) => {
  const users = await db.users.findMany({
    where: { id: { in: ids } }
  });
  return ids.map(id => users.find(u => u.id === id));
});

const resolvers = {
  Post: {
    author: (post, _, { loaders }) => {
      return loaders.user.load(post.authorId);
    }
  }
};
```

### 3. Query Complexity Limiting

```bash
npm install graphql-query-complexity
```

```typescript
import { createComplexityRule } from 'graphql-query-complexity';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    createComplexityRule({
      maximumComplexity: 1000,
      onComplete: (complexity) => {
        console.log('Query Complexity:', complexity);
      }
    })
  ]
});
```

### 4. Persistent Queries

```typescript
import { ApolloServerPluginInlineTraceDisabled } from '@apollo/server/plugin/disabled';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  persistedQueries: {
    cache: new Map() // Use Redis in production
  }
});
```

---

## Security Hardening

### 1. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/graphql', limiter);
```

### 2. Query Depth Limiting

```bash
npm install graphql-depth-limit
```

```typescript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(5)]
});
```

### 3. Disable Introspection in Production

```typescript
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    process.env.NODE_ENV === 'production'
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault()
  ]
});
```

### 4. Input Validation

```typescript
import { z } from 'zod';

const CreatePostInput = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(10000),
  tags: z.array(z.string()).max(10).optional()
});

const resolvers = {
  Mutation: {
    createPost: async (_, { input }) => {
      const validated = CreatePostInput.parse(input);
      return await createPost(validated);
    }
  }
};
```

---

## SSL/TLS Configuration

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location /graphql {
        proxy_pass http://localhost:4000/graphql;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Scaling Strategies

### Horizontal Scaling

```bash
# PM2 cluster mode
pm2 start dist/index.js -i max --name graphql-api

# Kubernetes auto-scaling (see HPA config above)
kubectl autoscale deployment graphql-api --cpu-percent=70 --min=3 --max=10
```

### Load Balancing

**AWS Application Load Balancer:**
- Health checks on `/health`
- Sticky sessions for WebSocket subscriptions
- SSL termination

**Nginx Load Balancer:**
```nginx
upstream graphql_backend {
    least_conn;
    server 10.0.1.10:4000;
    server 10.0.1.11:4000;
    server 10.0.1.12:4000;
}

server {
    listen 80;
    location /graphql {
        proxy_pass http://graphql_backend;
    }
}
```

---

## Backup & Disaster Recovery

### Database Backups

```bash
# PostgreSQL backup
pg_dump -h localhost -U graphql_user graphql_db > backup.sql

# Restore
psql -h localhost -U graphql_user graphql_db < backup.sql
```

### Automated Backups (Kubernetes CronJob)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16
            command:
            - /bin/sh
            - -c
            - pg_dump -h postgres -U user dbname > /backup/$(date +%Y%m%d).sql
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: backup-pvc
```

---

## Troubleshooting

### Common Issues

**1. High Memory Usage**
- Enable response caching
- Implement DataLoader
- Limit query complexity

**2. Slow Queries**
- Add database indexes
- Use query complexity analysis
- Enable APM monitoring

**3. WebSocket Connection Failures**
- Check sticky sessions on load balancer
- Verify CORS configuration
- Ensure WebSocket upgrade headers

**4. Authentication Errors**
- Verify JWT_SECRET is consistent across instances
- Check token expiration settings
- Validate Authorization header format

---

## Further Reading

- [Apollo Server Production Best Practices](https://www.apollographql.com/docs/apollo-server/production/)
- [GraphQL Performance Best Practices](https://graphql.org/learn/best-practices/#performance)
- [Kubernetes Production Best Practices](https://kubernetes.io/docs/setup/production-environment/)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)

