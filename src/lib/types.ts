/**
 * GraphQL context types and shared interfaces
 */

/**
 * Authenticated user in context
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * User roles for authorization
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
}

/**
 * GraphQL resolver context
 */
export interface GraphQLContext {
  /** Authenticated user (null if not authenticated) */
  user: AuthUser | null;
  /** Data loaders for N+1 prevention */
  loaders: DataLoaders;
  /** Server configuration */
  config: ServerConfig;
  /** Request metadata */
  request: {
    ip: string;
    userAgent: string;
  };
}

/**
 * Data loaders for batched data fetching
 */
export interface DataLoaders {
  /** User loader */
  userLoader: DataLoader<string, User | null>;
  /** Post loader */
  postLoader: DataLoader<string, Post | null>;
  /** Comments by post loader */
  commentsByPostLoader: DataLoader<string, Comment[]>;
}

/**
 * Generic DataLoader interface
 */
export interface DataLoader<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<(V | Error)[]>;
  clear(key: K): void;
  clearAll(): void;
}

// ─── Domain Models ───────────────────────────────────────────────

/**
 * User model
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Post model
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Comment model
 */
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  createdAt: Date;
}

// ─── Input Types ─────────────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  bio?: string;
}

export interface UpdateUserInput {
  name?: string;
  bio?: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  tags?: string[];
  published?: boolean;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  tags?: string[];
  published?: boolean;
}

export interface CreateCommentInput {
  content: string;
  postId: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Response Types ──────────────────────────────────────────────

export interface AuthPayload {
  token: string;
  user: User;
}

export interface PaginationArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface Edge<T> {
  node: T;
  cursor: string;
}

// ─── Subscription Events ────────────────────────────────────────

export enum SubscriptionEvent {
  POST_CREATED = 'POST_CREATED',
  POST_UPDATED = 'POST_UPDATED',
  POST_DELETED = 'POST_DELETED',
  COMMENT_ADDED = 'COMMENT_ADDED',
}

export interface SubscriptionPayload<T> {
  data: T;
  event: SubscriptionEvent;
  timestamp: Date;
}

// ─── Server Config ──────────────────────────────────────────────

export interface ServerConfig {
  port: number;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}
