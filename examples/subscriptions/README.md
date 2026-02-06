# Real-Time Subscriptions

## Setup

The server supports WebSocket subscriptions via `graphql-ws` at `ws://localhost:4000/graphql`.

## Available Subscriptions

### Post Created

Listen for new posts being published:

```graphql
subscription OnPostCreated {
  postCreated {
    id
    title
    content
    tags
    author {
      name
    }
  }
}
```

### Post Updated

Listen for post updates:

```graphql
subscription OnPostUpdated {
  postUpdated {
    id
    title
    content
    published
  }
}
```

### Comment Added

Listen for new comments on a specific post:

```graphql
subscription OnCommentAdded($postId: ID!) {
  commentAdded(postId: $postId) {
    id
    content
    author {
      name
    }
  }
}
```

Variables:
```json
{
  "postId": "id_4"
}
```

## Testing Subscriptions

1. Open Apollo Sandbox at `http://localhost:4000/graphql`
2. Start a subscription in one tab
3. Open another tab and run a mutation
4. Watch the subscription receive the event

### Example: Watch for New Posts

**Tab 1 - Subscribe:**
```graphql
subscription {
  postCreated {
    id
    title
    author { name }
  }
}
```

**Tab 2 - Create Post (with auth header):**
```graphql
mutation {
  createPost(input: {
    title: "Live Post"
    content: "This triggers the subscription!"
    published: true
  }) {
    id
    title
  }
}
```

Tab 1 will receive the new post event in real-time.
