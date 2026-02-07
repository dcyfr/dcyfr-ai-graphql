/**
 * Authentication Flow Example
 * 
 * Demonstrates:
 * - User registration
 * - User login
 * - Using JWT tokens for auth
 * - Making authenticated requests
 * - Current user query (me)
 * 
 * Run: tsx examples/auth-flow/client.ts
 */

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
}

async function query<T = any>(query: string, variables?: any, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers,
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
  console.log('🔐 Authentication Flow Example\n');

  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';

  try {
    // 1. Register a new user
    console.log('1️⃣  Registering new user...');
    const registerResult = await query(`
      mutation Register($input: CreateUserInput!) {
        register(input: $input) {
          token
          user {
            id
            email
            name
            role
          }
        }
      }
    `, {
      input: {
        email: testEmail,
        password: testPassword,
        name: 'Test User',
      },
    });

    const { token: registerToken, user: newUser } = registerResult.register;
    console.log(`   ✅ User registered successfully!`);
    console.log(`   User ID: ${newUser.id}`);
    console.log(`   Name: ${newUser.name}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Token (first 20 chars): ${registerToken.substring(0, 20)}...\n`);

    // 2. Query current user with token
    console.log('2️⃣  Fetching current user with token...');
    const meResult = await query(`
      query Me {
        me {
          id
          email
          name
          role
          bio
        }
      }
    `, {}, registerToken);

    console.log(`   ✅ Current user fetched!`);
    console.log(`   Name: ${meResult.me.name}`);
    console.log(`   Email: ${meResult.me.email}`);
    console.log(`   Bio: ${meResult.me.bio || '(not set)'}\n`);

    // 3. Try accessing protected resource without token
    console.log('3️⃣  Attempting protected query without token...');
    try {
      await query(`
        query Me {
          me {
            id
            name
          }
        }
      `);
      console.log('   ❌ Should have failed!');
    } catch (error) {
      console.log(`   ✅ Correctly rejected: ${(error as Error).message}\n`);
    }

    // 4. Login with credentials
    console.log('4️⃣  Logging in with credentials...');
    const loginResult = await query(`
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          token
          user {
            id
            email
            name
          }
        }
      }
    `, {
      input: {
        email: testEmail,
        password: testPassword,
      },
    });

    const { token: loginToken, user: loginUser } = loginResult.login;
    console.log(`   ✅ Login successful!`);
    console.log(`   User: ${loginUser.name}`);
    console.log(`   New token (first 20 chars): ${loginToken.substring(0, 20)}...\n`);

    // 5. Update user profile (authenticated mutation)
    console.log('5️⃣  Updating user profile...');
    const updateResult = await query(`
      mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
        updateUser(id: $id, input: $input) {
          id
          name
          bio
        }
      }
    `, {
      id: newUser.id,
      input: {
        name: 'Updated Test User',
        bio: 'This is my bio!',
      },
    }, loginToken);

    console.log(`   ✅ Profile updated!`);
    console.log(`   New name: ${updateResult.updateUser.name}`);
    console.log(`   Bio: ${updateResult.updateUser.bio}\n`);

    // 6. Create a post (authenticated mutation)
    console.log('6️⃣  Creating a post...');
    const createPostResult = await query(`
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          id
          title
          content
          published
          author {
            name
          }
        }
      }
    `, {
      input: {
        title: 'My First Post',
        content: 'This is the content of my first post created via API!',
        tags: ['test', 'example'],
        published: true,
      },
    }, loginToken);

    console.log(`   ✅ Post created!`);
    console.log(`   Post ID: ${createPostResult.createPost.id}`);
    console.log(`   Title: "${createPostResult.createPost.title}"`);
    console.log(`   Author: ${createPostResult.createPost.author.name}`);
    console.log(`   Published: ${createPostResult.createPost.published}\n`);

    // 7. Try login with wrong password
    console.log('7️⃣  Attempting login with wrong password...');
    try {
      await query(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user {
              id
            }
          }
        }
      `, {
        input: {
          email: testEmail,
          password: 'WrongPassword123!',
        },
      });
      console.log('   ❌ Should have failed!');
    } catch (error) {
      console.log(`   ✅ Correctly rejected: ${(error as Error).message}\n`);
    }

    // 8. Check user's posts
    console.log('8️⃣  Fetching user\'s posts...');
    const userWithPosts = await query(`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          posts {
            id
            title
            published
          }
        }
      }
    `, {
      id: newUser.id,
    });

    console.log(`   ✅ User has ${userWithPosts.user.posts.length} post(s):`);
    userWithPosts.user.posts.forEach((post: any, i: number) => {
      console.log(`   ${i + 1}. "${post.title}" (Published: ${post.published})`);
    });
    console.log();

    console.log('✅ All authentication flows completed successfully!');
    console.log('\n💡 Key Takeaways:');
    console.log('   - Register creates a new user and returns a JWT token');
    console.log('   - Login authenticates and returns a JWT token');
    console.log('   - JWT tokens must be included in Authorization header');
    console.log('   - Protected queries/mutations require authentication');
    console.log('   - Invalid credentials are properly rejected');

  } catch (error) {
    console.error('❌ Error in authentication flow:', error);
    process.exit(1);
  }
}

// Run the example
main();
