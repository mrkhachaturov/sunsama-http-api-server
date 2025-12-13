/**
 * API key authentication middleware
 *
 * Extracts the API key from the Authorization header,
 * looks up credentials, and attaches an authenticated
 * SunsamaClient to the request.
 */

import type { Request, Response, NextFunction } from 'express';
import type { SunsamaClient } from '../../client/index.js';
import type { ServerConfig, Credentials } from '../config/types.js';
import { sessionManager } from '../session/manager.js';

/**
 * Extended Request interface with SunsamaClient
 */
export interface AuthenticatedRequest extends Request {
  sunsamaClient: SunsamaClient;
  apiKey: string;
  credentials: Credentials;
}

/**
 * Check if a request is authenticated
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return 'sunsamaClient' in req && 'apiKey' in req;
}

/**
 * Create authentication middleware for the given config
 *
 * @param config - Server configuration with API key registry
 * @returns Express middleware function
 */
export function createAuthMiddleware(config: ServerConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          error: {
            message: 'Missing Authorization header',
            code: 'MISSING_AUTH_HEADER',
            status: 401,
          },
        });
        return;
      }

      // Parse Bearer token
      const match = authHeader.match(/^Bearer\s+(.+)$/i);

      if (!match) {
        res.status(401).json({
          error: {
            message: 'Invalid Authorization header format. Expected: Bearer <api_key>',
            code: 'INVALID_AUTH_FORMAT',
            status: 401,
          },
        });
        return;
      }

      const apiKey = match[1]!;

      // Look up credentials for this API key
      const credentials = config.apiKeys.get(apiKey);

      if (!credentials) {
        res.status(401).json({
          error: {
            message: 'Invalid API key',
            code: 'INVALID_API_KEY',
            status: 401,
          },
        });
        return;
      }

      // Get or create authenticated client
      const client = await sessionManager.getClient(apiKey, credentials);

      // Attach to request
      (req as AuthenticatedRequest).sunsamaClient = client;
      (req as AuthenticatedRequest).apiKey = apiKey;
      (req as AuthenticatedRequest).credentials = credentials;

      next();
    } catch (error) {
      next(error);
    }
  };
}
