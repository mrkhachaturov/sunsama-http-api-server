/**
 * Session types for the HTTP API server
 */

import type { SunsamaClient } from '../../client/index.js';

/**
 * A cached session containing an authenticated SunsamaClient
 */
export interface CachedSession {
  /** The authenticated client instance */
  client: SunsamaClient;
  /** Timestamp when this session was last used */
  lastUsed: number;
  /** Timestamp when this session was created */
  createdAt: number;
}
