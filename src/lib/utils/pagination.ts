/**
 * Pagination utilities for cursor-based pagination
 */

import type { Connection, Edge, PageInfo } from '../types.js';

/**
 * Encode cursor from ID
 */
export function encodeCursor(id: string): string {
  return Buffer.from(`cursor:${id}`).toString('base64url');
}

/**
 * Decode cursor to ID
 */
export function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
  return decoded.replace('cursor:', '');
}

/**
 * Build a paginated connection response
 */
export function buildConnection<T extends { id: string }>(
  items: T[],
  hasMore: boolean,
  totalCount: number
): Connection<T> {
  const edges: Edge<T>[] = items.map((item) => ({
    node: item,
    cursor: encodeCursor(item.id),
  }));

  const pageInfo: PageInfo = {
    hasNextPage: hasMore,
    hasPreviousPage: false, // Simplified - extend for backward pagination
    startCursor: edges.length > 0 ? edges[0]!.cursor : undefined,
    endCursor: edges.length > 0 ? edges[edges.length - 1]!.cursor : undefined,
  };

  return {
    edges,
    pageInfo,
    totalCount,
  };
}
