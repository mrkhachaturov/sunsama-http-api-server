/**
 * Configuration loader for the HTTP API server
 *
 * Supports two ways to provide API key credentials:
 * 1. Direct environment variable: API_KEY_sk_abc123=email:password
 * 2. File reference (Docker secrets): API_KEY_sk_abc123_FILE=/run/secrets/user1_creds
 */

import * as fs from 'fs';
import { ConfigError, type Credentials, type ServerConfig } from './types.js';

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

  return {
    port,
    host,
    apiKeys,
    enableSwagger,
  };
}

/**
 * Validate that at least one API key is configured
 */
export function validateConfig(config: ServerConfig): void {
  if (config.apiKeys.size === 0) {
    console.warn(
      '⚠️  No API keys configured. Set API_KEY_<key>=email:password environment variables.'
    );
  }
}

/**
 * Log configured API keys (masked for security)
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
}

export * from './types.js';
