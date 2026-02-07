/**
 * GraphQL Subscriptions Example
 * 
 * Demonstrates:
 * - WebSocket subscription connection
 * - Real-time post creation events
 * - Real-time comment notifications
 * - Subscription filtering
 * - Connection management
 * - Error handling
 * 
 * Run: tsx examples/subscriptions/client.ts
 */

import { createClient } from 'graphql-ws';
import WebSocket from 'ws';

// WebSocket GraphQL subscription client
const client = createClient({
  url: 'ws://localhost:4000/graphql',
  webSocketImpl: WebSocket,
  connectionParams: {
    // Add auth token if needed
    // authToken: 'your-jwt-token',
  },
});

interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  tags: string[];
  published: boolean;
}

interface Comment {
  id: string;
  content: string;
  post: {
    id: string;
    title: string;
  };
  author: {
    id: string;
    name: string;
  };
}

/**
 * Subscribe to new post creations
 */
function subscribeToPostCreated(): () => void {
  console.log('📡 Subscribing to post creations...\n');

  const subscription = client.subscribe(
    {
      query: `
        subscription OnPostCreated {
          postCreated {
            id
            title
            content
            author {
              id
              name
            }
            tags
            published
          }
        }
      `,
    },
    {
      next: (data) => {
        const post = (data.data as any).postCreated as Post;
        console.log('✨ New post created!');
        console.log(`   Title: "${post.title}"`);
        console.log(`   Author: ${post.author.name}`);
        console.log(`   Tags: ${post.tags.join(', ')}`);
        console.log(`   Published: ${post.published}`);
        console.log(`   Content preview: ${post.content.substring(0, 50)}...`);
        console.log();
      },
      error: (error) => {
        console.error('❌ Subscription error:', error);
      },
      complete: () => {
        console.log('✅ Subscription completed');
      },
    }
  );

  return subscription as () => void;
}

/**
 * Subscribe to new comments on a specific post
 */
function subscribeToComments(postId: string): () => void {
  console.log(`📡 Subscribing to comments on post ${postId}...\n`);

  const subscription = client.subscribe(
    {
      query: `
        subscription OnCommentAdded($postId: ID!) {
          commentAdded(postId: $postId) {
            id
            content
            post {
              id
              title
            }
            author {
              id
              name
            }
          }
        }
      `,
      variables: { postId },
    },
    {
      next: (data) => {
        const comment = (data.data as any).commentAdded as Comment;
        console.log('💬 New comment added!');
        console.log(`   Post: "${comment.post.title}"`);
        console.log(`   Author: ${comment.author.name}`);
        console.log(`   Content: ${comment.content}`);
        console.log();
      },
      error: (error) => {
        console.error('❌ Subscription error:', error);
      },
      complete: () => {
        console.log('✅ Subscription completed');
      },
    }
  );

  return subscription as () => void;
}

/**
 * Subscribe to published posts only (with filtering)
 */
function subscribeToPublishedPosts(): () => void {
  console.log('📡 Subscribing to published posts only...\n');

  const subscription = client.subscribe(
    {
      query: `
        subscription OnPublishedPostCreated {
          postCreated(published: true) {
            id
            title
            author {
              name
            }
            tags
          }
        }
      `,
    },
    {
      next: (data) => {
        const post = (data.data as any).postCreated as Post;
        console.log('📢 New published post!');
        console.log(`   Title: "${post.title}"`);
        console.log(`   Author: ${post.author.name}`);
        console.log(`   Tags: ${post.tags.join(', ')}`);
        console.log();
      },
      error: (error) => {
        console.error('❌ Subscription error:', error);
      },
      complete: () => {
        console.log('✅ Subscription completed');
      },
    }
  );

  return subscription as () => void;
}

/**
 * Subscribe to user activity (posts + comments)
 */
function subscribeToUserActivity(userId: string): () => void {
  console.log(`📡 Subscribing to user ${userId} activity...\n`);

  const subscription = client.subscribe(
    {
      query: `
        subscription OnUserActivity($userId: ID!) {
          userActivity(userId: $userId) {
            type
            timestamp
            ... on PostCreatedEvent {
              post {
                id
                title
              }
            }
            ... on CommentAddedEvent {
              comment {
                id
                content
                post {
                  title
                }
              }
            }
          }
        }
      `,
      variables: { userId },
    },
    {
      next: (data) => {
        const activity = (data.data as any).userActivity;
        console.log(`🔔 User activity detected!`);
        console.log(`   Type: ${activity.type}`);
        console.log(`   Time: ${new Date(activity.timestamp).toLocaleTimeString()}`);
        
        if (activity.post) {
          console.log(`   Post: "${activity.post.title}"`);
        } else if (activity.comment) {
          console.log(`   Comment: "${activity.comment.content}"`);
          console.log(`   On post: "${activity.comment.post.title}"`);
        }
        console.log();
      },
      error: (error) => {
        console.error('❌ Subscription error:', error);
      },
      complete: () => {
        console.log('✅ Subscription completed');
      },
    }
  );

  return subscription as () => void;
}

/**
 * Main function to demonstrate subscription patterns
 */
async function main() {
  console.log('🚀 GraphQL Subscriptions Example\n');
  console.log('This example demonstrates real-time subscriptions using WebSocket.\n');

  // Example 1: Subscribe to all post creations
  const unsubscribePostCreated = subscribeToPostCreated();

  // Example 2: Subscribe to comments on a specific post
  // (In a real app, this would be a specific post ID)
  const unsubscribeComments = subscribeToComments('post-123');

  // Example 3: Subscribe to published posts only
  const unsubscribePublished = subscribeToPublishedPosts();

  // Example 4: Subscribe to user activity
  // (In a real app, this would be a specific user ID)
  const unsubscribeUserActivity = subscribeToUserActivity('user-456');

  console.log('✅ All subscriptions active!\n');
  console.log('💡 Subscriptions will listen for events from the server.');
  console.log('   In another terminal, run mutations to trigger events:\n');
  console.log('   mutation CreatePost {');
  console.log('     createPost(input: {');
  console.log('       title: "Test Post"');
  console.log('       content: "Content"');
  console.log('       tags: ["test"]');
  console.log('       published: true');
  console.log('     }) {');
  console.log('       id title');
  console.log('     }');
  console.log('   }\n');
  console.log('Press Ctrl+C to exit and unsubscribe.\n');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...');
    
    unsubscribePostCreated();
    unsubscribeComments();
    unsubscribePublished();
    unsubscribeUserActivity();
    
    client.dispose();
    
    console.log('✅ All subscriptions closed');
    process.exit(0);
  });

  // Keep the script running
  await new Promise(() => {});
}

// Run the example
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
