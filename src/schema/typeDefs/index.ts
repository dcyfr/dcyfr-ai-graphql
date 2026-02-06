/**
 * Merge all type definitions
 */

export { baseTypeDefs } from './base.js';
export { userTypeDefs } from './user.js';
export { postTypeDefs } from './post.js';
export { commentTypeDefs } from './comment.js';
export { authTypeDefs } from './auth.js';

import { baseTypeDefs } from './base.js';
import { userTypeDefs } from './user.js';
import { postTypeDefs } from './post.js';
import { commentTypeDefs } from './comment.js';
import { authTypeDefs } from './auth.js';

/**
 * All type definitions combined
 */
export const typeDefs = [
  baseTypeDefs,
  userTypeDefs,
  postTypeDefs,
  commentTypeDefs,
  authTypeDefs,
];
