/**
 * Advanced Resolver Patterns Example
 * 
 * Demonstrates:
 * - Field resolvers vs root resolvers
 * - DataLoader for N+1 prevention
 * - Computed fields
 * - Resolver composition
 * - Context usage
 * - Error handling in resolvers
 * - Custom scalars
 * - Interface resolvers
 * 
 * This is a server-side example showing resolver implementation patterns.
 */

import DataLoader from 'dataloader';
import { GraphQLError } from 'graphql';

// ============================================================================
// DataLoader Setup (N+1 Prevention)
// ============================================================================

/**
 * Batch load users by IDs
 * Single database query instead of N queries
 */
const createUserLoader = () =>
  new DataLoader<string, User>(async (userIds) => {
    console.log(`[DataLoader] Batching ${userIds.length} user queries`);
    
    // Simulated database query - in production, use actual DB query
    const users = await db.users.findMany({
      where: { id: { in: userIds } },
    });

    // Return users in same order as requested IDs
    const userMap = new Map(users.map((u) => [u.id, u]));
    return userIds.map((id) => userMap.get(id) || new Error(`User ${id} not found`));
  });

/**
 * Batch load posts by user ID
 */
const createPostsByUserLoader = () =>
  new DataLoader<string, Post[]>(async (userIds) => {
    console.log(`[DataLoader] Batching ${userIds.length} posts-by-user queries`);
    
    const posts = await db.posts.findMany({
      where: { authorId: { in: userIds } },
    });

    // Group posts by authorId
    const postsByUser = new Map<string, Post[]>();
    posts.forEach((post) => {
      const existing = postsByUser.get(post.authorId) || [];
      postsByUser.set(post.authorId, [...existing, post]);
    });

    return userIds.map((id) => postsByUser.get(id) || []);
  });

// ============================================================================
// Resolver Context
// ============================================================================

interface ResolverContext {
  // Current authenticated user
  currentUser?: User;
  
  // DataLoaders for batching
  loaders: {
    user: ReturnType<typeof createUserLoader>;
    postsByUser: ReturnType<typeof createPostsByUserLoader>;
  };
  
  // Database access
  db: typeof db;
  
  // Request metadata
  request: {
    ip: string;
    userAgent: string;
  };
}

/**
 * Create context for each request
 */
export function createContext(req: any): ResolverContext {
  return {
    currentUser: req.user, // From JWT middleware
    loaders: {
      user: createUserLoader(),
      postsByUser: createPostsByUserLoader(),
    },
    db,
    request: {
      ip: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    },
  };
}

// ============================================================================
// Type Resolvers
// ============================================================================

/**
 * User type resolvers
 * Root object is the User from database
 */
const User = {
  /**
   * Simple field resolver
   * Returns data directly from root object
   */
  id: (parent: User) => parent.id,
  email: (parent: User) => parent.email,
  name: (parent: User) => parent.name,

  /**
   * Computed field - not in database
   * Calculates full name from firstName + lastName
   */
  fullName: (parent: User) => {
    return `${parent.firstName} ${parent.lastName}`.trim();
  },

  /**
   * Computed field - initials
   */
  initials: (parent: User) => {
    const first = parent.firstName?.[0] || '';
    const last = parent.lastName?.[0] || '';
    return (first + last).toUpperCase();
  },

  /**
   * Async field resolver with DataLoader
   * Prevents N+1 queries when fetching user's posts
   */
  posts: async (parent: User, _args: any, context: ResolverContext) => {
    return context.loaders.postsByUser.load(parent.id);
  },

  /**
   * Computed field with database aggregation
   */
  postCount: async (parent: User, _args: any, context: ResolverContext) => {
    return context.db.posts.count({
      where: { authorId: parent.id },
    });
  },

  /**
   * Privacy-aware field resolver
   * Only show email to the user themselves or admins
   */
  email: (parent: User, _args: any, context: ResolverContext) => {
    const isOwner = context.currentUser?.id === parent.id;
    const isAdmin = context.currentUser?.role === 'ADMIN';
    
    if (isOwner || isAdmin) {
      return parent.email;
    }
    
    // Return null for other users
    return null;
  },

  /**
   * Computed field - account age in days
   */
  accountAge: (parent: User) => {
    const now = new Date();
    const created = new Date(parent.createdAt);
    const diffMs = now.getTime() - created.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },
};

/**
 * Post type resolvers
 */
const Post = {
  id: (parent: Post) => parent.id,
  title: (parent: Post) => parent.title,
  content: (parent: Post) => parent.content,

  /**
   * Async field resolver with DataLoader
   * Efficiently load author without N+1
   */
  author: async (parent: Post, _args: any, context: ResolverContext) => {
    return context.loaders.user.load(parent.authorId);
  },

  /**
   * Computed field - excerpt
   */
  excerpt: (parent: Post, args: { length?: number }) => {
    const maxLength = args.length || 100;
    if (parent.content.length <= maxLength) {
      return parent.content;
    }
    return parent.content.substring(0, maxLength) + '...';
  },

  /**
   * Computed field - reading time estimate
   */
  readingTime: (parent: Post) => {
    const wordsPerMinute = 200;
    const wordCount = parent.content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  },

  /**
   * Lazy load comments only when requested
   */
  comments: async (parent: Post, _args: any, context: ResolverContext) => {
    return context.db.comments.findMany({
      where: { postId: parent.id },
    });
  },

  /**
   * Privacy-aware field
   * Only show draft posts to their author
   */
  content: (parent: Post, _args: any, context: ResolverContext) => {
    if (parent.published) {
      return parent.content;
    }
    
    const isAuthor = context.currentUser?.id === parent.authorId;
    if (isAuthor) {
      return parent.content;
    }
    
    throw new GraphQLError('Cannot access unpublished post', {
      extensions: { code: 'FORBIDDEN' },
    });
  },
};

// ============================================================================
// Query Resolvers
// ============================================================================

const Query = {
  /**
   * Simple query - single entity by ID
   */
  user: async (_parent: any, args: { id: string }, context: ResolverContext) => {
    return context.loaders.user.load(args.id);
  },

  /**
   * List query with filtering
   */
  users: async (
    _parent: any,
    args: { role?: string; search?: string },
    context: ResolverContext
  ) => {
    const where: any = {};
    
    if (args.role) {
      where.role = args.role;
    }
    
    if (args.search) {
      where.OR = [
        { name: { contains: args.search, mode: 'insensitive' } },
        { email: { contains: args.search, mode: 'insensitive' } },
      ];
    }
    
    return context.db.users.findMany({ where });
  },

  /**
   * Authenticated query - requires login
   */
  me: async (_parent: any, _args: any, context: ResolverContext) => {
    if (!context.currentUser) {
      throw new GraphQLError('You must be logged in', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    
    return context.currentUser;
  },

  /**
   * Complex query with joins and sorting
   */
  posts: async (
    _parent: any,
    args: {
      published?: boolean;
      authorId?: string;
      tags?: string[];
      sortBy?: 'createdAt' | 'title';
      sortOrder?: 'asc' | 'desc';
    },
    context: ResolverContext
  ) => {
    const where: any = {};
    
    if (args.published !== undefined) {
      where.published = args.published;
    }
    
    if (args.authorId) {
      where.authorId = args.authorId;
    }
    
    if (args.tags && args.tags.length > 0) {
      where.tags = { hasSome: args.tags };
    }
    
    const orderBy: any = {};
    if (args.sortBy) {
      orderBy[args.sortBy] = args.sortOrder || 'desc';
    }
    
    return context.db.posts.findMany({ where, orderBy });
  },
};

// ============================================================================
// Mutation Resolvers
// ============================================================================

const Mutation = {
  /**
   * Create mutation with authorization
   */
  createPost: async (
    _parent: any,
    args: { input: CreatePostInput },
    context: ResolverContext
  ) => {
    // Require authentication
    if (!context.currentUser) {
      throw new GraphQLError('You must be logged in to create a post', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    
    // Validate input
    if (!args.input.title || args.input.title.length < 3) {
      throw new GraphQLError('Title must be at least 3 characters', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    
    // Create post
    const post = await context.db.posts.create({
      data: {
        title: args.input.title,
        content: args.input.content,
        tags: args.input.tags || [],
        published: args.input.published ?? false,
        authorId: context.currentUser.id,
      },
    });
    
    return post;
  },

  /**
   * Update mutation with ownership check
   */
  updatePost: async (
    _parent: any,
    args: { id: string; input: UpdatePostInput },
    context: ResolverContext
  ) => {
    if (!context.currentUser) {
      throw new GraphQLError('You must be logged in', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    
    // Check ownership
    const existingPost = await context.db.posts.findUnique({
      where: { id: args.id },
    });
    
    if (!existingPost) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    
    const isAuthor = existingPost.authorId === context.currentUser.id;
    const isAdmin = context.currentUser.role === 'ADMIN';
    
    if (!isAuthor && !isAdmin) {
      throw new GraphQLError('You do not have permission to update this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    
    // Update post
    const updated = await context.db.posts.update({
      where: { id: args.id },
      data: args.input,
    });
    
    return updated;
  },

  /**
   * Delete mutation with authorization
   */
  deletePost: async (
    _parent: any,
    args: { id: string },
    context: ResolverContext
  ) => {
    if (!context.currentUser) {
      throw new GraphQLError('You must be logged in', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    
    const post = await context.db.posts.findUnique({
      where: { id: args.id },
    });
    
    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }
    
    const isAuthor = post.authorId === context.currentUser.id;
    const isAdmin = context.currentUser.role === 'ADMIN';
    
    if (!isAuthor && !isAdmin) {
      throw new GraphQLError('You do not have permission to delete this post', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    
    await context.db.posts.delete({
      where: { id: args.id },
    });
    
    return true;
  },
};

// ============================================================================
// Interface Resolvers
// ============================================================================

/**
 * Interface type resolver
 * Determines concrete type for Node interface
 */
const Node = {
  __resolveType(obj: any) {
    if (obj.email) {
      return 'User';
    }
    if (obj.title) {
      return 'Post';
    }
    if (obj.content && obj.postId) {
      return 'Comment';
    }
    return null;
  },
};

// ============================================================================
// Export Resolvers
// ============================================================================

export const resolvers = {
  Query,
  Mutation,
  User,
  Post,
  Node,
};

/**
 * Usage Example:
 * 
 * import { ApolloServer } from '@apollo/server';
 * import { resolvers } from './resolvers';
 * import { typeDefs } from './schema';
 * 
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 * });
 */

/**
 * Key Patterns Demonstrated:
 * 
 * 1. DataLoader for N+1 Prevention
 *    - Batch database queries automatically
 *    - Per-request caching
 * 
 * 2. Computed Fields
 *    - fullName, excerpt, readingTime
 *    - Not stored in database
 * 
 * 3. Privacy-Aware Resolvers
 *    - email field - only visible to owner/admin
 *    - content field - only visible if published or owner
 * 
 * 4. Authorization in Resolvers
 *    - Check currentUser before mutations
 *    - Verify ownership for updates/deletes
 * 
 * 5. Error Handling
 *    - GraphQLError with extension codes
 *    - UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, BAD_USER_INPUT
 * 
 * 6. Context Usage
 *    - currentUser for auth
 *    - loaders for batching
 *    - db for data access
 * 
 * 7. Resolver Composition
 *    - Field resolvers build on root object
 *    - Lazy loading of related data
 */
