/**
 * Session manager for maintaining authenticated SunsamaClient instances
 *
 * Simple in-memory session cache for multi-user support.
 * Each API key maps to one authenticated client instance.
 */

import { SunsamaClient } from '../../client/index.js';
import type { Credentials } from '../config/types.js';
import type { CachedSession } from './types.js';

/**
 * Manages authenticated SunsamaClient sessions for multiple users
 */
export class SessionManager {
  private sessions = new Map<string, CachedSession>();

  /**
   * Get an authenticated client for the given API key
   *
   * If a session exists, returns the cached client.
   * If no session exists, creates a new client and authenticates.
   *
   * @param apiKey - The API key identifying the user
   * @param credentials - The Sunsama credentials for authentication
   * @returns An authenticated SunsamaClient
   */
  async getClient(apiKey: string, credentials: Credentials): Promise<SunsamaClient> {
    const cached = this.sessions.get(apiKey);

    if (cached) {
      // Update last used timestamp
      cached.lastUsed = Date.now();
      return cached.client;
    }

    // Create and authenticate new client
    const client = new SunsamaClient();
    await client.login(credentials.email, credentials.password);

    // Cache the authenticated client
    const now = Date.now();
    this.sessions.set(apiKey, {
      client,
      lastUsed: now,
      createdAt: now,
    });

    return client;
  }

  /**
   * Refresh a client session by re-authenticating
   *
   * Called when a request fails with 401 from Sunsama,
   * indicating the session has expired.
   *
   * @param apiKey - The API key identifying the user
   * @param credentials - The Sunsama credentials for authentication
   * @returns A freshly authenticated SunsamaClient
   */
  async refreshClient(apiKey: string, credentials: Credentials): Promise<SunsamaClient> {
    // Remove old session
    this.sessions.delete(apiKey);

    // Create and authenticate new client
    const client = new SunsamaClient();
    await client.login(credentials.email, credentials.password);

    // Cache the new client
    const now = Date.now();
    this.sessions.set(apiKey, {
      client,
      lastUsed: now,
      createdAt: now,
    });

    return client;
  }

  /**
   * Remove a session for the given API key
   *
   * @param apiKey - The API key to remove
   */
  removeSession(apiKey: string): void {
    const session = this.sessions.get(apiKey);
    if (session) {
      session.client.logout();
      this.sessions.delete(apiKey);
    }
  }

  /**
   * Get the number of active sessions
   */
  get size(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for shutdown)
   */
  clearAll(): void {
    for (const [apiKey] of this.sessions) {
      this.removeSession(apiKey);
    }
  }
}

// Singleton instance for the application
export const sessionManager = new SessionManager();
