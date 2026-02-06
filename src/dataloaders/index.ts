/**
 * DataLoader factory - creates loaders for each request
 */

import { createDataLoader } from './loader.js';
import { UserService } from '../services/user.service.js';
import { PostService } from '../services/post.service.js';
import { CommentService } from '../services/comment.service.js';
import type { DataLoaders, User, Post, Comment } from '../lib/types.js';
import type { ServerConfig } from '../lib/types.js';

/**
 * Create data loaders for a request
 * Each request gets fresh loaders to prevent cache leaks
 */
export function createDataLoaders(config: ServerConfig): DataLoaders {
  const userService = new UserService(config);
  const postService = new PostService();
  const commentService = new CommentService();

  return {
    userLoader: createDataLoader<string, User | null>(async (ids) => {
      return userService.findByIds(ids);
    }),

    postLoader: createDataLoader<string, Post | null>(async (ids) => {
      return postService.findByIds(ids);
    }),

    commentsByPostLoader: createDataLoader<string, Comment[]>(async (postIds) => {
      const commentsMap = await commentService.getByPostIds(postIds);
      return postIds.map((id) => commentsMap.get(id) ?? []);
    }),
  };
}
