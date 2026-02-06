# Basic GraphQL Queries

## Health Check

```graphql
query Health {
  health {
    status
    timestamp
    version
  }
}
```

## User Queries

```graphql
# Get user by ID
query GetUser {
  user(id: "id_1") {
    id
    name
    email
    role
    bio
    posts {
      id
      title
    }
  }
}

# List users with pagination
query ListUsers {
  users(first: 10) {
    edges {
      node {
        id
        name
        email
        role
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

# Get current user (requires auth)
query Me {
  me {
    id
    name
    email
    role
  }
}
```

## Post Queries

```graphql
# List all published posts
query ListPosts {
  posts(first: 10) {
    edges {
      node {
        id
        title
        content
        published
        tags
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
    pageInfo {
      hasNextPage
    }
  }
}

# Filter posts by tag
query PostsByTag {
  posts(first: 10, tag: "graphql") {
    edges {
      node {
        id
        title
        tags
      }
    }
  }
}

# Get single post
query GetPost {
  post(id: "id_4") {
    id
    title
    content
    author {
      name
    }
    comments {
      content
      author {
        name
      }
    }
  }
}
```

## Comments

```graphql
# Get comments for a post
query GetComments {
  comments(postId: "id_4") {
    id
    content
    author {
      name
    }
  }
}
```
