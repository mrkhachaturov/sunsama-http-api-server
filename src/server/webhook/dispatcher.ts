/**
 * Webhook dispatcher
 *
 * Handles sending webhook HTTP POST requests with HMAC signing.
 */

import { createHmac } from 'crypto';
import { logger } from '../utils/logger.js';
import type { WebhookConfig, WebhookPayload, WebhookDeliveryResult } from './types.js';

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Send a webhook to the configured URL
 */
export async function dispatchWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();

  // Check if event type is enabled
  if (config.events.length > 0 && !config.events.includes(payload.event)) {
    return {
      success: true,
      duration: Date.now() - startTime,
    };
  }

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, config.secret);

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'User-Agent': 'Sunsama-API-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      logger.info(
        `Webhook delivered: ${payload.event} for task ${payload.data.task?._id || 'deleted'} (${duration}ms)`
      );
      return {
        success: true,
        statusCode: response.status,
        duration,
      };
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(
        `Webhook failed: ${payload.event} - HTTP ${response.status}: ${errorText.slice(0, 200)}`
      );
      return {
        success: false,
        statusCode: response.status,
        error: errorText.slice(0, 500),
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Webhook error: ${payload.event} - ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Create a webhook payload
 */
export function createWebhookPayload(
  event: WebhookPayload['event'],
  apiKey: string,
  data: WebhookPayload['data']
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    apiKey,
    data,
  };
}
