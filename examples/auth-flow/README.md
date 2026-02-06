# Authentication Flow

## 1. Register a New User

```graphql
mutation Register {
  register(input: {
    email: "jane@example.com"
    name: "Jane Doe"
    password: "securePassword123"
    bio: "Software engineer"
  }) {
    token
    user {
      id
      name
      email
      role
    }
  }
}
```

## 2. Login

```graphql
mutation Login {
  login(input: {
    email: "jane@example.com"
    password: "securePassword123"
  }) {
    token
    user {
      id
      name
      email
    }
  }
}
```

## 3. Use Token for Authenticated Operations

Add the token to the HTTP headers:

```json
{
  "Authorization": "Bearer <token-from-login>"
}
```

## 4. Create a Post (Authenticated)

```graphql
mutation CreatePost {
  createPost(input: {
    title: "My First Post"
    content: "This is my first GraphQL post!"
    tags: ["graphql", "tutorial"]
    published: true
  }) {
    id
    title
    published
    author {
      name
    }
  }
}
```

## 5. Update Your Profile

```graphql
mutation UpdateProfile {
  updateUser(id: "<your-user-id>", input: {
    bio: "Updated bio"
  }) {
    id
    name
    bio
  }
}
```

## 6. Create a Comment

```graphql
mutation AddComment {
  createComment(input: {
    content: "Great post!"
    postId: "<post-id>"
  }) {
    id
    content
    author {
      name
    }
    post {
      title
    }
  }
}
```

## Role-Based Access

- **USER** - Can create/update/delete own posts and comments
- **ADMIN** - Can update/delete any user, full access
- **GUEST** - Read-only access (no mutations)
