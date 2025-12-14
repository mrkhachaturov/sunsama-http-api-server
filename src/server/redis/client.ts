/**
 * Redis client wrapper
 *
 * Provides connection management and helper methods for Redis operations.
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient: Redis | null = null;

export interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
}

/**
 * Initialize Redis connection
 */
export function initRedis(config: RedisConfig): Redis {
  if (redisClient) {
    return redisClient;
  }

  const retryStrategy = (times: number) => {
    if (times > 10) {
      logger.error('Redis: Max retries reached, giving up');
      return null;
    }
    const delay = Math.min(times * 200, 2000);
    logger.warn(`Redis: Retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  };

  if (config.url) {
    redisClient = new Redis(config.url, {
      maxRetriesPerRequest: 3,
      retryStrategy,
    });
  } else {
    redisClient = new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      maxRetriesPerRequest: 3,
      retryStrategy,
    });
  }

  redisClient.on('connect', () => {
    logger.info('Redis: Connected');
  });

  redisClient.on('error', err => {
    logger.error('Redis: Error -', err.message);
  });

  redisClient.on('close', () => {
    logger.debug('Redis: Connection closed');
  });

  return redisClient;
}

/**
 * Get the Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return redisClient?.status === 'ready';
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis: Disconnected');
  }
}

/**
 * Store an API-originated change to prevent duplicate webhooks
 *
 * @param apiKey - The API key that made the change
 * @param taskId - The task ID that was changed
 * @param eventType - The type of change (created, updated, deleted, completed)
 * @param ttlSeconds - TTL for the marker (default: 90 seconds)
 */
export async function markApiChange(
  apiKey: string,
  taskId: string,
  eventType: string,
  ttlSeconds = 90
): Promise<void> {
  const redis = getRedis();
  const key = `api_change:${apiKey}:${taskId}`;
  await redis.set(key, eventType, 'EX', ttlSeconds);
}

/**
 * Check if a change was made via API (should skip webhook)
 *
 * @param apiKey - The API key to check
 * @param taskId - The task ID to check
 * @returns The event type if it was API-originated, null otherwise
 */
export async function checkApiChange(apiKey: string, taskId: string): Promise<string | null> {
  const redis = getRedis();
  const key = `api_change:${apiKey}:${taskId}`;
  const value = await redis.get(key);

  if (value) {
    // Clean up after checking
    await redis.del(key);
  }

  return value;
}

export default {
  initRedis,
  getRedis,
  isRedisConnected,
  closeRedis,
  markApiChange,
  checkApiChange,
};
