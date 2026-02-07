/**
 * Basic GraphQL Queries Example
 * 
 * This demonstrates common query patterns:
 * - Simple queries (health check)
 * - Queries with arguments (fetch by ID)
 * - Pagination (connections)
 * - Nested relationships
 * 
 * Run: tsx examples/basic-queries/client.ts
 */

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
}

async function query<T = any>(query: string, variables?: any): Promise<T> {
  const response = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json: GraphQLResponse<T> = await response.json();

  if (json.errors) {
    console.error('GraphQL Errors:', json.errors);
    throw new Error(json.errors[0].message);
  }

  return json.data!;
}

async function main() {
  console.log('🚀 Basic GraphQL Queries Example\n');

  try {
    // 1. Health Check
    console.log('1️⃣  Health Check');
    const health = await query(`
      query Health {
        health {
          status
          timestamp
          version
        }
      }
    `);
    console.log('   Server Status:', health.health.status);
    console.log('   Version:', health.health.version);
    console.log('   Timestamp:', health.health.timestamp, '\n');

    // 2. List Posts with Pagination
    console.log('2️⃣  List Posts (First 3)');
    const posts = await query(`
      query ListPosts($first: Int!, $after: String) {
        posts(first: $first, after: $after) {
          edges {
            node {
              id
              title
              published
              tags
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      first: 3,
    });
    
    console.log(`   Found ${posts.posts.edges.length} posts:`);
    posts.posts.edges.forEach((edge: any, i: number) => {
      console.log(`   ${i + 1}. ${edge.node.title}`);
      console.log(`      ID: ${edge.node.id}`);
      console.log(`      Published: ${edge.node.published}`);
      console.log(`      Tags: ${edge.node.tags?.join(', ') || 'none'}`);
    });
    console.log(`   Has Next Page: ${posts.posts.pageInfo.hasNextPage}\n`);

    // 3. Nested Relationships - Posts with Authors
    console.log('3️⃣  Posts with Authors (Nested Query)');
    const postsWithAuthors = await query(`
      query PostsWithAuthors($first: Int!) {
        posts(first: $first) {
          edges {
            node {
              id
              title
              author {
                id
                name
                email
              }
            }
          }
        }
      }
    `, {
      first: 2,
    });
    
    postsWithAuthors.posts.edges.forEach((edge: any, i: number) => {
      console.log(`   ${i + 1}. "${edge.node.title}"`);
      console.log(`      Author: ${edge.node.author.name} (${edge.node.author.email})`);
    });
    console.log();

    // 4. Fetch Single Post with Comments
    if (posts.posts.edges.length > 0) {
      const firstPostId = posts.posts.edges[0].node.id;
      
      console.log('4️⃣  Single Post with Comments');
      const singlePost = await query(`
        query GetPost($id: ID!) {
          post(id: $id) {
            id
            title
            content
            author {
              name
            }
            comments {
              id
              content
              author {
                name
              }
            }
          }
        }
      `, {
        id: firstPostId,
      });
      
      if (singlePost.post) {
        console.log(`   Title: "${singlePost.post.title}"`);
        console.log(`   Author: ${singlePost.post.author.name}`);
        console.log(`   Content: ${singlePost.post.content.substring(0, 100)}...`);
        console.log(`   Comments (${singlePost.post.comments.length}):`);
        singlePost.post.comments.slice(0, 3).forEach((comment: any) => {
          console.log(`   - ${comment.author.name}: "${comment.content.substring(0, 60)}..."`);
        });
      }
      console.log();
    }

    // 5. Filter Posts by Tag
    console.log('5️⃣  Filter Posts by Tag');
    const taggedPosts = await query(`
      query PostsByTag($tag: String!, $first: Int!) {
        posts(tag: $tag, first: $first) {
          edges {
            node {
              id
              title
              tags
            }
          }
        }
      }
    `, {
      tag: 'graphql',
      first: 5,
    });
    
    console.log(`   Posts tagged with "graphql": ${taggedPosts.posts.edges.length}`);
    taggedPosts.posts.edges.forEach((edge: any, i: number) => {
      console.log(`   ${i + 1}. ${edge.node.title}`);
    });
    console.log();

    // 6. List Users
    console.log('6️⃣  List Users');
    const users = await query(`
      query ListUsers($first: Int!) {
        users(first: $first) {
          edges {
            node {
              id
              name
              email
              role
            }
          }
        }
      }
    `, {
      first: 5,
    });
    
    console.log(`   Total users fetched: ${users.users.edges.length}`);
    users.users.edges.forEach((edge: any, i: number) => {
      console.log(`   ${i + 1}. ${edge.node.name} (${edge.node.role})`);
      console.log(`      Email: ${edge.node.email}`);
    });
    console.log();

    console.log('✅ All queries completed successfully!');

  } catch (error) {
    console.error('❌ Error running queries:', error);
    process.exit(1);
  }
}

// Run the example
main();
