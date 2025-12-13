/**
 * Swagger/OpenAPI configuration
 *
 * Generates OpenAPI 3.0 spec from JSDoc comments in route files.
 */

import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

// Get the routes directory path (works for both CJS and ESM)
// The server always runs from dist/esm or dist/cjs, so we resolve from there
function getRoutesGlobs(): string[] {
  // Use process.cwd() and resolve to src for dev, or dist for prod
  const basePath = process.cwd();
  return [
    path.join(basePath, 'src/server/routes/*.ts'),
    path.join(basePath, 'dist/esm/server/routes/*.js'),
    path.join(basePath, 'dist/cjs/server/routes/*.js'),
  ];
}

/**
 * OpenAPI specification options
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sunsama HTTP API',
      version: '1.0.0',
      description: `
HTTP REST API server for Sunsama - Built on top of sunsama-api.

## Authentication

All API endpoints require Bearer token authentication. 
Use your configured API key in the Authorization header:

\`\`\`
Authorization: Bearer sk_your_api_key
\`\`\`

## Rate Limiting

This API proxies requests to Sunsama's internal GraphQL API. 
Please be mindful of rate limits and avoid excessive requests.
      `,
      contact: {
        name: 'GitHub Repository',
        url: 'https://github.com/mrkhachaturov/sunsama-http-api-server',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key configured via API_KEY_<key> environment variable',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                status: { type: 'integer' },
              },
            },
          },
        },
        Task: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Task ID' },
            text: { type: 'string', description: 'Task title/text' },
            notes: { type: 'string', description: 'Task notes in HTML' },
            completed: { type: 'boolean', description: 'Whether task is completed' },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            snoozeUntil: { type: 'string', format: 'date-time', nullable: true },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            timeEstimate: { type: 'integer', description: 'Time estimate in minutes' },
            streamIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Associated stream IDs',
            },
          },
        },
        Stream: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'Stream ID' },
            name: { type: 'string', description: 'Stream name' },
            color: { type: 'string', description: 'Stream color' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', description: 'User ID' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            timezone: { type: 'string', description: 'User timezone' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to route files for JSDoc parsing
  apis: getRoutesGlobs(),
};

/**
 * Generated OpenAPI specification
 */
export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
