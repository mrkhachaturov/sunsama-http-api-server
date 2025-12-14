/**
 * HTTP API Server for Sunsama API
 *
 * Main entry point for the server.
 */

import { initializeApp } from './app.js';
import { sessionManager } from './session/manager.js';
import { initRedis, closeRedis } from './redis/client.js';
import { startWatcher, stopWatcher } from './webhook/watcher.js';
import { SunsamaClient } from '../client/index.js';

/**
 * Start the HTTP server
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Sunsama API Server...\n');

  try {
    const { app, config } = initializeApp();

    // Initialize Redis and webhook watcher if enabled
    if (config.webhook.enabled) {
      console.log('\n🔧 Initializing webhook system...');

      // Initialize Redis
      initRedis(config.redis);

      // Create clients for each API key
      const watcherClients: Array<{ apiKey: string; client: SunsamaClient }> = [];

      for (const [apiKey, credentials] of config.apiKeys) {
        const client = new SunsamaClient();
        try {
          await client.login(credentials.email, credentials.password);
          watcherClients.push({ apiKey, client });
          console.log(`   ✅ Authenticated for webhook watcher: ${apiKey.slice(0, 4)}...`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`   ❌ Failed to authenticate ${apiKey.slice(0, 4)}...: ${message}`);
        }
      }

      // Start the watcher
      if (watcherClients.length > 0) {
        startWatcher(watcherClients, config.webhook);
      }
    }

    const server = app.listen(config.port, config.host, () => {
      console.log(`\n✅ Server is running at http://${config.host}:${config.port}`);
      console.log(`   Health check: http://${config.host}:${config.port}/health`);
      console.log(`   API base: http://${config.host}:${config.port}/api`);
      if (config.enableSwagger) {
        console.log(`   Swagger UI: http://${config.host}:${config.port}/api-docs`);
      }
      if (config.webhook.enabled) {
        console.log(`   Webhooks: enabled (polling every ${config.webhook.pollInterval}s)`);
      }
      console.log('');
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

      // Stop webhook watcher
      if (config.webhook.enabled) {
        stopWatcher();
        await closeRedis();
      }

      server.close(() => {
        console.log('   HTTP server closed');

        // Clear all sessions
        sessionManager.clearAll();
        console.log('   Sessions cleared');

        console.log('👋 Goodbye!\n');
        process.exit(0);
      });

      // Force exit after timeout
      setTimeout(() => {
        console.error('   Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
main();
