/**
 * HTTP API Server for Sunsama API
 *
 * Main entry point for the server.
 */

import { initializeApp } from './app.js';
import { sessionManager } from './session/manager.js';

/**
 * Start the HTTP server
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Sunsama API Server...\n');

  try {
    const { app, config } = initializeApp();

    const server = app.listen(config.port, config.host, () => {
      console.log(`\n✅ Server is running at http://${config.host}:${config.port}`);
      console.log(`   Health check: http://${config.host}:${config.port}/health`);
      console.log(`   API base: http://${config.host}:${config.port}/api\n`);
    });

    // Graceful shutdown handling
    const shutdown = (signal: string) => {
      console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

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
