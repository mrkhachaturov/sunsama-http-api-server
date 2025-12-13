/**
 * Webhook types and interfaces
 */

import type { Task } from '../../types/index.js';

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'task.created'
  | 'task.completed'
  | 'task.uncompleted'
  | 'task.deleted'
  | 'task.updated'
  | 'task.scheduled';

/**
 * All available webhook events
 */
export const WEBHOOK_EVENTS: WebhookEventType[] = [
  'task.created',
  'task.completed',
  'task.uncompleted',
  'task.deleted',
  'task.updated',
  'task.scheduled',
];

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  /** Enable webhook system */
  enabled: boolean;
  /** Target URL for webhook POSTs */
  url: string;
  /** HMAC signing secret */
  secret: string;
  /** Polling interval for today + backlog in seconds (default: 30) */
  pollInterval: number;
  /** Polling interval for week scope in seconds (default: 300 = 5 min) */
  pollIntervalWeek: number;
  /** Polling interval for past weeks in seconds (default: 900 = 15 min) */
  pollIntervalPast: number;
  /** Polling interval for future weeks in seconds (default: 600 = 10 min) */
  pollIntervalFuture: number;
  /** How many past weeks to poll (default: 1 = last week) */
  pollWeeksPast: number;
  /** Extra days before past weeks (default: 0) */
  pollExtraDaysPast: number;
  /** How many future weeks to poll (default: 1 = next week) */
  pollWeeksAhead: number;
  /** Extra days after future weeks (default: 0) */
  pollExtraDaysAhead: number;
  /** Event types to send (empty = all events) */
  events: WebhookEventType[];
}

/**
 * Field change record for task.updated events
 */
export interface FieldChange<T = unknown> {
  old: T;
  new: T;
}

/**
 * Webhook event payload
 */
export interface WebhookPayload {
  /** Event type */
  event: WebhookEventType;
  /** Timestamp of the event */
  timestamp: string;
  /** API key that owns this data */
  apiKey: string;
  /** Event data */
  data: {
    /** Current task state (null for deleted) */
    task: Task | null;
    /** Previous task state (for updates) */
    previousTask?: Task;
    /** Field-level changes (for task.updated) */
    changes?: Record<string, FieldChange>;
  };
}

/**
 * Stored task state for comparison
 */
export interface StoredTaskState {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  snoozeUntil: string | null;
  dueDate: string | null;
  timeEstimate: number | null;
  /** Backlog bucket type (week, month, quarter, year, someday, never) */
  timeHorizonType: string | null;
  updatedAt: string;
  /** Hash of the full task for quick comparison */
  hash: string;
}

/**
 * Stored state for a user's tasks
 */
export interface UserTasksState {
  /** Last poll timestamp */
  lastPoll: string;
  /** Task states by ID */
  tasks: Record<string, StoredTaskState>;
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  duration: number;
}
