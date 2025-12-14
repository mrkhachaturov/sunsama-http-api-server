/**
 * Express application configuration
 *
 * Sets up middleware, routes, and error handling.
 */

import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { loadConfig, logConfig, validateConfig, type ServerConfig } from './config/index.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import swaggerSpec from './swagger/index.js';

/**
 * Create and configure the Express application
 */
export function createApp(config: ServerConfig): Express {
  const app = express();

  // Trust reverse proxy headers (X-Forwarded-For, X-Forwarded-Proto, etc.)
  // Required for correct client IP detection and HTTPS awareness behind nginx/traefik/etc.
  app.set('trust proxy', true);

  // Security middleware - relax for Swagger UI (dev only), strict for production
  if (config.enableSwagger) {
    app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP entirely for Swagger UI
        hsts: false, // Disable HSTS - we're on HTTP for local dev
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: false,
        originAgentCluster: false,
      })
    );
  } else {
    app.use(helmet());
  }

  // CORS - allow all origins for API access
  app.use(cors());

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint (no auth required)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || 'unknown',
    });
  });

  // Swagger UI (conditionally enabled, no auth required)
  if (config.enableSwagger) {
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Sunsama API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
      })
    );

    // Serve raw OpenAPI spec as JSON
    app.get('/api-docs.json', (_req: Request, res: Response) => {
      res.json(swaggerSpec);
    });
  }

  // API routes (auth required)
  app.use('/api', createAuthMiddleware(config), apiRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Initialize and return the configured app
 *
 * Loads configuration from environment variables.
 */
export function initializeApp(): { app: Express; config: ServerConfig } {
  const config = loadConfig();
  validateConfig(config);
  logConfig(config);

  const app = createApp(config);

  return { app, config };
}
