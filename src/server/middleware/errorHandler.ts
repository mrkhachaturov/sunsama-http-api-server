/**
 * Error handling middleware
 *
 * Catches all errors from route handlers and maps them
 * to appropriate HTTP status codes and JSON responses.
 */

import type { Request, Response, NextFunction } from 'express';
import {
  SunsamaError,
  SunsamaApiError,
  SunsamaAuthError,
  SunsamaValidationError,
  SunsamaNetworkError,
} from '../../errors/index.js';
import { ConfigError } from '../config/types.js';

/**
 * Error response structure
 */
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    status: number;
    field?: string;
  };
}

/**
 * Map error to HTTP status code
 */
function getStatusCode(error: Error): number {
  if (error instanceof SunsamaAuthError) {
    return 401;
  }

  if (error instanceof SunsamaValidationError) {
    return 400;
  }

  if (error instanceof SunsamaApiError) {
    // Forward the status from Sunsama, or use 502 Bad Gateway
    return error.status >= 400 && error.status < 600 ? error.status : 502;
  }

  if (error instanceof SunsamaNetworkError) {
    return 503; // Service Unavailable
  }

  if (error instanceof ConfigError) {
    return 500;
  }

  if (error instanceof SunsamaError) {
    return 500;
  }

  return 500;
}

/**
 * Get error code from error
 */
function getErrorCode(error: Error): string {
  if (error instanceof SunsamaError && error.code) {
    return error.code;
  }

  if (error instanceof SunsamaAuthError) {
    return 'AUTH_ERROR';
  }

  if (error instanceof SunsamaValidationError) {
    return 'VALIDATION_ERROR';
  }

  if (error instanceof SunsamaApiError) {
    return 'API_ERROR';
  }

  if (error instanceof SunsamaNetworkError) {
    return 'NETWORK_ERROR';
  }

  if (error instanceof ConfigError) {
    return 'CONFIG_ERROR';
  }

  return 'INTERNAL_ERROR';
}

/**
 * Express error handling middleware
 *
 * Must be registered after all routes.
 */
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = getStatusCode(error);
  const code = getErrorCode(error);

  const response: ErrorResponse = {
    error: {
      message: error.message,
      code,
      status,
    },
  };

  // Add field for validation errors
  if (error instanceof SunsamaValidationError && error.field) {
    response.error.field = error.field;
  }

  // Log server errors
  if (status >= 500) {
    console.error(`[ERROR] ${code}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  res.status(status).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: 'Not Found',
      code: 'NOT_FOUND',
      status: 404,
    },
  });
}
