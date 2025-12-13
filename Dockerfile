# Sunsama API Server
# Multi-stage build for optimized image size

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sunsama -u 1001

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set ownership
RUN chown -R sunsama:nodejs /app

# Switch to non-root user
USER sunsama

# Expose port (configurable via PORT env var)
# Environment variables:
#   PORT - Server port (default: 3000)
#   HOST - Server host (default: 0.0.0.0)
#   ENABLE_SWAGGER - Enable Swagger UI at /api-docs (default: false)
#   API_KEY_<key> - API key credentials in format email:password
#   API_KEY_<key>_FILE - Path to file containing credentials (for Docker secrets)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:${PORT:-3000}/health || exit 1

# Start the server (using CJS to avoid ESM module type warnings)
CMD ["node", "dist/cjs/server/index.js"]

