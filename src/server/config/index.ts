/**
 * Configuration loader for the HTTP API server
 *
 * Supports two ways to provide API key credentials:
 * 1. Direct environment variable: API_KEY_sk_abc123=email:password
 * 2. File reference (Docker secrets): API_KEY_sk_abc123_FILE=/run/secrets/user1_creds
 */

import * as fs from 'fs';
import {
  ConfigError,
  type Credentials,
  type ServerConfig,
  type WebhookConfig,
  type RedisConfig,
} from './types.js';
import { WEBHOOK_EVENTS, type WebhookEventType } from '../webhook/types.js';

const API_KEY_PREFIX = 'API_KEY_';
const FILE_SUFFIX = '_FILE';

/**
 * Parse credentials from a string in format "email:password"
 */
function parseCredentials(value: string, apiKey: string): Credentials {
  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) {
    throw new ConfigError(
      `Invalid credentials format for API key "${apiKey}". Expected "email:password" format.`
    );
  }

  const email = value.slice(0, colonIndex).trim();
  const password = value.slice(colonIndex + 1).trim();

  if (!email || !password) {
    throw new ConfigError(`Empty email or password for API key "${apiKey}". Both are required.`);
  }

  return { email, password };
}

/**
 * Load API keys from environment variables
 *
 * Supports:
 * - API_KEY_<key>=email:password (direct value)
 * - API_KEY_<key>_FILE=/path/to/file (file containing email:password)
 */
function loadApiKeys(): Map<string, Credentials> {
  const registry = new Map<string, Credentials>();

  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (!envKey.startsWith(API_KEY_PREFIX) || !envValue) {
      continue;
    }

    let apiKey: string;
    let credentials: string;

    if (envKey.endsWith(FILE_SUFFIX)) {
      // Read from file (Docker secrets)
      apiKey = envKey.slice(API_KEY_PREFIX.length, -FILE_SUFFIX.length);
      const filePath = envValue;

      try {
        credentials = fs.readFileSync(filePath, 'utf-8').trim();
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        throw new ConfigError(
          `Failed to read credentials file for API key "${apiKey}" from "${filePath}": ${err.message}`
        );
      }
    } else {
      // Direct value
      apiKey = envKey.slice(API_KEY_PREFIX.length);
      credentials = envValue;
    }

    if (!apiKey) {
      throw new ConfigError(`Empty API key name in environment variable "${envKey}"`);
    }

    const parsed = parseCredentials(credentials, apiKey);
    registry.set(apiKey, parsed);
  }

  return registry;
}

/**
 * Load webhook configuration from environment variables
 */
function loadWebhookConfig(): WebhookConfig {
  const enabled = process.env['WEBHOOK_ENABLED']?.toLowerCase() === 'true';
  const url = process.env['WEBHOOK_URL'] || '';
  const secret = process.env['WEBHOOK_SECRET'] || '';

  // Tiered polling intervals (4 scopes)
  const pollInterval = parseInt(process.env['WEBHOOK_POLL_INTERVAL'] || '30', 10);
  const pollIntervalWeek = parseInt(process.env['WEBHOOK_POLL_INTERVAL_WEEK'] || '300', 10);
  const pollIntervalPast = parseInt(process.env['WEBHOOK_POLL_INTERVAL_PAST'] || '900', 10);
  const pollIntervalFuture = parseInt(process.env['WEBHOOK_POLL_INTERVAL_FUTURE'] || '600', 10);

  // Calendar-based week range
  const pollWeeksPast = parseInt(process.env['WEBHOOK_POLL_WEEKS_PAST'] || '1', 10);
  const pollExtraDaysPast = parseInt(process.env['WEBHOOK_POLL_EXTRA_DAYS_PAST'] || '0', 10);
  const pollWeeksAhead = parseInt(process.env['WEBHOOK_POLL_WEEKS_AHEAD'] || '1', 10);
  const pollExtraDaysAhead = parseInt(process.env['WEBHOOK_POLL_EXTRA_DAYS_AHEAD'] || '0', 10);

  // Parse event filter
  const eventsEnv = process.env['WEBHOOK_EVENTS'] || '';
  let events: WebhookEventType[] = [];
  if (eventsEnv) {
    const parsed = eventsEnv.split(',').map(e => e.trim()) as WebhookEventType[];
    events = parsed.filter(e => WEBHOOK_EVENTS.includes(e));
  }

  return {
    enabled,
    url,
    secret,
    pollInterval: isNaN(pollInterval) || pollInterval < 5 ? 30 : pollInterval,
    pollIntervalWeek: isNaN(pollIntervalWeek) || pollIntervalWeek < 30 ? 300 : pollIntervalWeek,
    pollIntervalPast: isNaN(pollIntervalPast) || pollIntervalPast < 60 ? 900 : pollIntervalPast,
    pollIntervalFuture:
      isNaN(pollIntervalFuture) || pollIntervalFuture < 60 ? 600 : pollIntervalFuture,
    pollWeeksPast: isNaN(pollWeeksPast) || pollWeeksPast < 0 ? 1 : pollWeeksPast,
    pollExtraDaysPast: isNaN(pollExtraDaysPast) || pollExtraDaysPast < 0 ? 0 : pollExtraDaysPast,
    pollWeeksAhead: isNaN(pollWeeksAhead) || pollWeeksAhead < 0 ? 1 : pollWeeksAhead,
    pollExtraDaysAhead:
      isNaN(pollExtraDaysAhead) || pollExtraDaysAhead < 0 ? 0 : pollExtraDaysAhead,
    events,
  };
}

/**
 * Load Redis configuration from environment variables
 */
function loadRedisConfig(): RedisConfig {
  const url = process.env['REDIS_URL'];
  const host = process.env['REDIS_HOST'];
  const port = parseInt(process.env['REDIS_PORT'] || '6379', 10);
  const password = process.env['REDIS_PASSWORD'];

  return {
    url,
    host,
    port: isNaN(port) ? 6379 : port,
    password,
  };
}

/**
 * Load server configuration from environment variables
 */
export function loadConfig(): ServerConfig {
  const port = parseInt(process.env['PORT'] || '3000', 10);
  const host = process.env['HOST'] || '0.0.0.0';
  const enableSwagger = process.env['ENABLE_SWAGGER']?.toLowerCase() === 'true';

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ConfigError(`Invalid PORT value. Expected a number between 1 and 65535.`);
  }

  const apiKeys = loadApiKeys();
  const webhook = loadWebhookConfig();
  const redis = loadRedisConfig();

  return {
    port,
    host,
    apiKeys,
    enableSwagger,
    webhook,
    redis,
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: ServerConfig): void {
  if (config.apiKeys.size === 0) {
    console.warn(
      '⚠️  No API keys configured. Set API_KEY_<key>=email:password environment variables.'
    );
  }

  // Validate webhook config
  if (config.webhook.enabled) {
    if (!config.webhook.url) {
      throw new ConfigError('WEBHOOK_URL is required when WEBHOOK_ENABLED=true');
    }
    if (!config.webhook.secret) {
      throw new ConfigError('WEBHOOK_SECRET is required when WEBHOOK_ENABLED=true');
    }

    // Validate URL format
    try {
      new URL(config.webhook.url);
    } catch {
      throw new ConfigError(`Invalid WEBHOOK_URL: ${config.webhook.url}`);
    }

    // Validate Redis is configured
    if (!config.redis.url && !config.redis.host) {
      throw new ConfigError(
        'Redis is required when webhooks are enabled. Set REDIS_URL or REDIS_HOST.'
      );
    }
  }
}

/**
 * Log configured settings (masked for security)
 */
export function logConfig(config: ServerConfig): void {
  console.log(`🔧 Server configuration:`);
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Swagger UI: ${config.enableSwagger ? 'enabled at /api-docs' : 'disabled'}`);
  console.log(`   API keys: ${config.apiKeys.size} configured`);

  for (const [apiKey, creds] of config.apiKeys) {
    const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';
    const maskedEmail = creds.email.length > 6 ? `${creds.email.slice(0, 3)}...` : '***';
    console.log(`   - ${maskedKey} → ${maskedEmail}`);
  }

  // Log webhook config
  if (config.webhook.enabled) {
    console.log(`🔔 Webhook configuration:`);
    console.log(`   URL: ${config.webhook.url}`);
    console.log(
      `   Poll intervals: today=${config.webhook.pollInterval}s, week=${config.webhook.pollIntervalWeek}s, past=${config.webhook.pollIntervalPast}s, future=${config.webhook.pollIntervalFuture}s`
    );

    // Calculate scope description
    const pastDesc =
      config.webhook.pollWeeksPast > 0
        ? `${config.webhook.pollWeeksPast} week(s)${config.webhook.pollExtraDaysPast > 0 ? ` + ${config.webhook.pollExtraDaysPast} days` : ''}`
        : config.webhook.pollExtraDaysPast > 0
          ? `${config.webhook.pollExtraDaysPast} days`
          : 'none';
    const futureDesc =
      config.webhook.pollWeeksAhead > 0
        ? `${config.webhook.pollWeeksAhead} week(s)${config.webhook.pollExtraDaysAhead > 0 ? ` + ${config.webhook.pollExtraDaysAhead} days` : ''}`
        : config.webhook.pollExtraDaysAhead > 0
          ? `${config.webhook.pollExtraDaysAhead} days`
          : 'none';

    console.log(`   Poll scope: past=[${pastDesc}] + this week + future=[${futureDesc}] + backlog`);
    console.log(
      `   Events: ${config.webhook.events.length > 0 ? config.webhook.events.join(', ') : 'all'}`
    );
    console.log(`   Redis: ${config.redis.url || `${config.redis.host}:${config.redis.port}`}`);
  }
}

export * from './types.js';
