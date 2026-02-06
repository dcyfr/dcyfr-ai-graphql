/**
 * Request logging middleware
 */

export interface LogEntry {
  timestamp: string;
  operation: string | null;
  duration: number;
  ip?: string;
  userId?: string;
}

/**
 * Simple logger for GraphQL operations
 */
export function logOperation(entry: LogEntry): void {
  const { timestamp, operation, duration, ip, userId } = entry;
  const userInfo = userId ? ` user=${userId}` : '';
  const ipInfo = ip ? ` ip=${ip}` : '';
  console.log(`[GraphQL] ${timestamp} | ${operation ?? 'anonymous'} | ${duration}ms${userInfo}${ipInfo}`);
}

/**
 * Create a timing function
 */
export function startTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
