/**
 * Webhook watcher
 *
 * Polls Sunsama API for changes and triggers webhooks.
 */

import { createHash } from 'crypto';
import { SunsamaClient } from '../../client/index.js';
import type { Task } from '../../types/index.js';
import { getRedis, checkApiChange } from '../redis/client.js';
import { dispatchWebhook, createWebhookPayload } from './dispatcher.js';
import { logger } from '../utils/logger.js';
import type {
  WebhookConfig,
  WebhookEventType,
  StoredTaskState,
  UserTasksState,
  FieldChange,
} from './types.js';

interface WatcherClient {
  apiKey: string;
  client: SunsamaClient;
}

let watcherIntervalToday: NodeJS.Timeout | null = null;
let watcherIntervalWeek: NodeJS.Timeout | null = null;
let watcherIntervalPast: NodeJS.Timeout | null = null;
let watcherIntervalFuture: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Generate a hash for a task's state
 */
function hashTaskState(task: Task): string {
  const stateString = JSON.stringify({
    text: task.text,
    completed: task.completed,
    completeDate: task.completeDate,
    snoozeUntil: task.snooze?.until || null,
    dueDate: task.dueDate,
    timeEstimate: task.timeEstimate,
    notes: task.notes,
    streamIds: task.streamIds,
    // Backlog bucket tracking
    timeHorizonType: task.timeHorizon?.type || null,
    timeHorizonRelativeTo: task.timeHorizon?.relativeTo || null,
  });
  return createHash('md5').update(stateString).digest('hex');
}

/**
 * Convert a Task to StoredTaskState
 */
function taskToStoredState(task: Task): StoredTaskState {
  return {
    id: task._id,
    text: task.text || '',
    completed: task.completed || false,
    completedAt: task.completeDate || null,
    snoozeUntil: task.snooze?.until || null,
    dueDate: task.dueDate || null,
    timeEstimate: task.timeEstimate || null,
    timeHorizonType: task.timeHorizon?.type || null,
    updatedAt: new Date().toISOString(),
    hash: hashTaskState(task),
  };
}

/**
 * Get stored state for a user from Redis
 */
async function getStoredState(apiKey: string): Promise<UserTasksState | null> {
  const redis = getRedis();
  const data = await redis.get(`webhook_state:${apiKey}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save state for a user to Redis
 */
async function saveStoredState(apiKey: string, state: UserTasksState): Promise<void> {
  const redis = getRedis();
  await redis.set(`webhook_state:${apiKey}`, JSON.stringify(state), 'EX', 86400 * 7); // 7 days TTL
}

/**
 * Detect changes between old and new task states
 */
function detectChanges(
  oldState: StoredTaskState | null,
  newState: StoredTaskState | null,
  _task: Task | null
): { event: WebhookEventType; changes?: Record<string, FieldChange> } | null {
  // Task was deleted
  if (oldState && !newState) {
    return { event: 'task.deleted' };
  }

  // Task was created
  if (!oldState && newState) {
    return { event: 'task.created' };
  }

  // Both exist - check for changes
  if (oldState && newState && oldState.hash !== newState.hash) {
    // Check for completion change
    if (!oldState.completed && newState.completed) {
      return { event: 'task.completed' };
    }
    if (oldState.completed && !newState.completed) {
      return { event: 'task.uncompleted' };
    }

    // Check for schedule change (snooze date)
    if (oldState.snoozeUntil !== newState.snoozeUntil) {
      return {
        event: 'task.scheduled',
        changes: {
          snoozeUntil: { old: oldState.snoozeUntil, new: newState.snoozeUntil },
        },
      };
    }

    // Check for backlog bucket change (timeHorizon)
    if (oldState.timeHorizonType !== newState.timeHorizonType) {
      return {
        event: 'task.scheduled',
        changes: {
          timeHorizon: { old: oldState.timeHorizonType, new: newState.timeHorizonType },
        },
      };
    }

    // General update - collect all field changes
    const changes: Record<string, FieldChange> = {};

    if (oldState.text !== newState.text) {
      changes['text'] = { old: oldState.text, new: newState.text };
    }
    if (oldState.dueDate !== newState.dueDate) {
      changes['dueDate'] = { old: oldState.dueDate, new: newState.dueDate };
    }
    if (oldState.timeEstimate !== newState.timeEstimate) {
      changes['timeEstimate'] = { old: oldState.timeEstimate, new: newState.timeEstimate };
    }

    return {
      event: 'task.updated',
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    };
  }

  return null;
}

/**
 * Get date string for N days from a base date
 */
function getDateOffset(daysOffset: number, baseDate: Date = new Date()): string {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0]!;
}

/**
 * Get the Monday of the current week
 */
function getThisWeekMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 6 days from Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get all days in a week starting from a Monday
 */
function getWeekDays(monday: Date): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(getDateOffset(i, monday));
  }
  return days;
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch tasks with rate limiting - processes in batches with delays
 */
async function fetchTasksWithRateLimit(
  client: SunsamaClient,
  days: string[],
  batchSize: number = 5,
  delayMs: number = 100
): Promise<Task[]> {
  const allTasks: Task[] = [];

  for (let i = 0; i < days.length; i += batchSize) {
    const batch = days.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(day => client.getTasksByDay(day)));

    for (const tasks of results) {
      allTasks.push(...tasks);
    }

    // Add delay between batches (except after the last batch)
    if (i + batchSize < days.length) {
      await delay(delayMs);
    }
  }

  return allTasks;
}

type PollScope = 'today' | 'week' | 'past' | 'future';

/**
 * Get days to poll based on scope (calendar-based weeks)
 */
function getDaysForScope(scope: PollScope, config: WebhookConfig): string[] {
  const days: string[] = [];
  const thisMonday = getThisWeekMonday();

  switch (scope) {
    case 'today':
      // Just today
      days.push(getDateOffset(0));
      break;

    case 'week': {
      // This week (Monday to Sunday) - excluding today (handled by 'today' scope)
      const today = getDateOffset(0);
      for (const day of getWeekDays(thisMonday)) {
        if (day !== today) {
          days.push(day);
        }
      }
      break;
    }

    case 'past': {
      // Past weeks + extra days
      const weeksPast = config.pollWeeksPast || 1;
      const extraDaysPast = config.pollExtraDaysPast || 0;

      // Calculate past weeks (each week is 7 days before the previous Monday)
      for (let w = 1; w <= weeksPast; w++) {
        const pastMonday = new Date(thisMonday);
        pastMonday.setDate(thisMonday.getDate() - w * 7);
        days.push(...getWeekDays(pastMonday));
      }

      // Extra days before past weeks
      if (extraDaysPast > 0) {
        const earliestMonday = new Date(thisMonday);
        earliestMonday.setDate(thisMonday.getDate() - weeksPast * 7);
        for (let d = 1; d <= extraDaysPast; d++) {
          days.push(getDateOffset(-d, earliestMonday));
        }
      }
      break;
    }

    case 'future': {
      // Future weeks + extra days
      const weeksAhead = config.pollWeeksAhead || 1;
      const extraDaysAhead = config.pollExtraDaysAhead || 0;

      // Future weeks (each week is 7 days after this Sunday)
      for (let w = 1; w <= weeksAhead; w++) {
        const futureMonday = new Date(thisMonday);
        futureMonday.setDate(thisMonday.getDate() + w * 7);
        days.push(...getWeekDays(futureMonday));
      }

      // Extra days after future weeks
      if (extraDaysAhead > 0) {
        const latestMonday = new Date(thisMonday);
        latestMonday.setDate(thisMonday.getDate() + weeksAhead * 7);
        const latestSunday = new Date(latestMonday);
        latestSunday.setDate(latestMonday.getDate() + 6);
        for (let d = 1; d <= extraDaysAhead; d++) {
          days.push(getDateOffset(d, latestSunday));
        }
      }
      break;
    }
  }

  return days;
}

/**
 * Poll for changes for a single user
 */
async function pollForUser(
  apiKey: string,
  client: SunsamaClient,
  config: WebhookConfig,
  scope: PollScope = 'today'
): Promise<void> {
  try {
    // Get days based on scope
    const days = getDaysForScope(scope, config);

    // Always fetch backlog for 'today' scope
    const includeBacklog = scope === 'today';

    // Fetch tasks with rate limiting (5 concurrent, 100ms delay between batches)
    const [backlogTasks, dayTasks] = await Promise.all([
      includeBacklog ? client.getTasksBacklog() : Promise.resolve([]),
      days.length > 0 ? fetchTasksWithRateLimit(client, days, 5, 100) : Promise.resolve([]),
    ]);

    // Combine tasks
    const allTasks: Task[] = [...backlogTasks, ...dayTasks];
    const currentTasksMap = new Map<string, Task>();
    for (const task of allTasks) {
      currentTasksMap.set(task._id, task);
    }

    // Get stored state
    const storedState = await getStoredState(apiKey);
    const oldTasksMap = storedState?.tasks || {};
    const isFirstPoll = Object.keys(oldTasksMap).length === 0;

    // Build new state by MERGING with existing (don't lose tasks from other scopes)
    const newState: UserTasksState = {
      lastPoll: new Date().toISOString(),
      tasks: { ...oldTasksMap }, // Start with existing tasks
    };

    // On FIRST poll, just store baseline state without emitting events
    if (isFirstPoll) {
      logger.info(
        `First poll for ${apiKey} (${scope}) - storing baseline (${currentTasksMap.size} tasks)`
      );
      for (const [taskId, currentTask] of currentTasksMap) {
        newState.tasks[taskId] = taskToStoredState(currentTask);
      }
      await saveStoredState(apiKey, newState);
      return;
    }

    // Detect changes only for tasks in current scope
    for (const [taskId, currentTask] of currentTasksMap) {
      const oldTaskState = oldTasksMap[taskId] || null;
      const newTaskState = taskToStoredState(currentTask);

      // Update state with current task data
      newState.tasks[taskId] = newTaskState;

      // Skip if task didn't exist before (new task we haven't seen)
      // This prevents "created" spam for tasks that existed before our baseline
      if (!oldTaskState) {
        continue;
      }

      // Detect changes
      const change = detectChanges(oldTaskState, newTaskState, currentTask);

      if (change) {
        // Check if this was an API-originated change
        const apiOriginated = await checkApiChange(apiKey, taskId);
        if (apiOriginated) {
          logger.debug(`Skipping webhook for ${change.event} on task ${taskId} (API-originated)`);
          continue;
        }

        // Create and dispatch webhook
        const payload = createWebhookPayload(change.event, apiKey, {
          task: currentTask,
          changes: change.changes,
        });

        await dispatchWebhook(config, payload);
      }
    }

    // Note: We don't emit "deleted" events for tasks not in current scope
    // because they might still exist in other scopes (different days)

    // Save merged state
    await saveStoredState(apiKey, newState);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Webhook watcher error for ${apiKey}: ${message}`);
  }
}

/**
 * Start the webhook watcher
 */
export function startWatcher(clients: WatcherClient[], config: WebhookConfig): void {
  if (isRunning) {
    logger.warn('Webhook watcher already running');
    return;
  }

  if (clients.length === 0) {
    logger.warn('No clients configured for webhook watcher');
    return;
  }

  const totalWeeks = 1 + config.pollWeeksPast + config.pollWeeksAhead; // this week + past + future
  const extraDays = config.pollExtraDaysPast + config.pollExtraDaysAhead;
  logger.info(
    `Starting webhook watcher (${clients.length} users, ${totalWeeks} weeks + ${extraDays} extra days)`
  );
  logger.info(
    `  Intervals: today=${config.pollInterval}s, week=${config.pollIntervalWeek}s, past=${config.pollIntervalPast}s, future=${config.pollIntervalFuture}s`
  );
  isRunning = true;

  // Poll functions for each scope
  const pollToday = async () => {
    for (const { apiKey, client } of clients) {
      await pollForUser(apiKey, client, config, 'today');
    }
  };

  const pollWeek = async () => {
    for (const { apiKey, client } of clients) {
      await pollForUser(apiKey, client, config, 'week');
    }
  };

  const pollPast = async () => {
    for (const { apiKey, client } of clients) {
      await pollForUser(apiKey, client, config, 'past');
    }
  };

  const pollFuture = async () => {
    for (const { apiKey, client } of clients) {
      await pollForUser(apiKey, client, config, 'future');
    }
  };

  // Run initial poll after short delay (all scopes)
  setTimeout(() => {
    Promise.all([pollToday(), pollWeek(), pollPast(), pollFuture()]).catch(err => {
      logger.error('Initial webhook poll failed:', err);
    });
  }, 5000);

  // Start tiered intervals
  watcherIntervalToday = setInterval(() => {
    pollToday().catch(err => {
      logger.error('Today poll failed:', err);
    });
  }, config.pollInterval * 1000);

  watcherIntervalWeek = setInterval(() => {
    pollWeek().catch(err => {
      logger.error('Week poll failed:', err);
    });
  }, config.pollIntervalWeek * 1000);

  watcherIntervalPast = setInterval(() => {
    pollPast().catch(err => {
      logger.error('Past poll failed:', err);
    });
  }, config.pollIntervalPast * 1000);

  watcherIntervalFuture = setInterval(() => {
    pollFuture().catch(err => {
      logger.error('Future poll failed:', err);
    });
  }, config.pollIntervalFuture * 1000);
}

/**
 * Stop the webhook watcher
 */
export function stopWatcher(): void {
  if (watcherIntervalToday) {
    clearInterval(watcherIntervalToday);
    watcherIntervalToday = null;
  }
  if (watcherIntervalWeek) {
    clearInterval(watcherIntervalWeek);
    watcherIntervalWeek = null;
  }
  if (watcherIntervalPast) {
    clearInterval(watcherIntervalPast);
    watcherIntervalPast = null;
  }
  if (watcherIntervalFuture) {
    clearInterval(watcherIntervalFuture);
    watcherIntervalFuture = null;
  }
  isRunning = false;
  logger.info('Webhook watcher stopped');
}

/**
 * Check if watcher is running
 */
export function isWatcherRunning(): boolean {
  return isRunning;
}
