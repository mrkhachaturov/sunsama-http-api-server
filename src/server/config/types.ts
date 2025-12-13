/**
 * Configuration types for the HTTP API server
 */

import type { WebhookEventType } from '../webhook/types.js';

/**
 * Credentials for Sunsama authentication
 */
export interface Credentials {
  email: string;
  password: string;
}

/**
 * Redis configuration
 */
export interface RedisConfig {
  /** Redis URL (redis://host:port) */
  url?: string;
  /** Redis host (if not using URL) */
  host?: string;
  /** Redis port (if not using URL) */
  port?: number;
  /** Redis password */
  password?: string;
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Enable webhook system */
  enabled: boolean;
  /** Target URL for webhook POSTs */
  url: string;
  /** HMAC signing secret */
  secret: string;
  /** Polling interval for today + backlog in seconds (default: 30) */
  pollInterval: number;
  /** Polling interval for week scope in seconds (default: 300 = 5 min) */
  pollIntervalWeek: number;
  /** Polling interval for past weeks in seconds (default: 900 = 15 min) */
  pollIntervalPast: number;
  /** Polling interval for future weeks in seconds (default: 600 = 10 min) */
  pollIntervalFuture: number;
  /** How many past weeks to poll (default: 1 = last week) */
  pollWeeksPast: number;
  /** Extra days before past weeks (default: 0) */
  pollExtraDaysPast: number;
  /** How many future weeks to poll (default: 1 = next week) */
  pollWeeksAhead: number;
  /** Extra days after future weeks (default: 0) */
  pollExtraDaysAhead: number;
  /** Event types to send (empty = all events) */
  events: WebhookEventType[];
}

/**
 * Server configuration
 */
export interface ServerConfig {
  /** Port to listen on */
  port: number;
  /** Host to bind to */
  host: string;
  /** API key registry: maps API keys to credentials */
  apiKeys: Map<string, Credentials>;
  /** Whether to enable Swagger UI at /api-docs */
  enableSwagger: boolean;
  /** Webhook configuration */
  webhook: WebhookConfig;
  /** Redis configuration (required when webhooks enabled) */
  redis: RedisConfig;
}

/**
 * Configuration error thrown when config is invalid
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
