/**
 * Configuration types for the HTTP API server
 */

/**
 * Credentials for Sunsama authentication
 */
export interface Credentials {
  email: string;
  password: string;
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
