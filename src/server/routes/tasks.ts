/**
 * Task routes
 *
 * CRUD operations for Sunsama tasks.
 */

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type Router as RouterType,
} from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const router: RouterType = Router();

/**
 * GET /api/tasks/day/:date
 *
 * Get tasks for a specific day
 *
 * @param date - Date in YYYY-MM-DD format
 * @query timezone - Optional timezone (e.g., "America/New_York")
 */
router.get('/day/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { date } = req.params;
    const timezone = req.query['timezone'] as string | undefined;

    const tasks = await authReq.sunsamaClient.getTasksByDay(date!, timezone);
    res.json({ data: tasks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/backlog
 *
 * Get backlog tasks
 */
router.get('/backlog', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tasks = await authReq.sunsamaClient.getTasksBacklog();
    res.json({ data: tasks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/archived
 *
 * Get archived tasks with pagination
 *
 * @query offset - Offset for pagination (default: 0)
 * @query limit - Number of tasks to return (default: 300)
 */
router.get('/archived', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const offset = parseInt(req.query['offset'] as string) || 0;
    const limit = parseInt(req.query['limit'] as string) || 300;

    const tasks = await authReq.sunsamaClient.getArchivedTasks(offset, limit);
    res.json({ data: tasks, pagination: { offset, limit } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tasks/:id
 *
 * Get a specific task by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const task = await authReq.sunsamaClient.getTaskById(id!);

    if (!task) {
      res.status(404).json({
        error: {
          message: 'Task not found',
          code: 'TASK_NOT_FOUND',
          status: 404,
        },
      });
      return;
    }

    res.json({ data: task });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tasks
 *
 * Create a new task
 *
 * @body text - Task text/title (required)
 * @body notes - Task notes (optional)
 * @body timeEstimate - Time estimate in minutes (optional)
 * @body streamIds - Array of stream IDs (optional)
 * @body dueDate - Due date as ISO string (optional)
 * @body snoozeUntil - Snooze until date as ISO string (optional)
 * @body taskId - Custom task ID (optional)
 * @body private - Whether the task is private (optional)
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { text, ...options } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        error: {
          message: 'Task text is required',
          code: 'VALIDATION_ERROR',
          status: 400,
          field: 'text',
        },
      });
      return;
    }

    const result = await authReq.sunsamaClient.createTask(text, options);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/complete
 *
 * Mark a task as complete
 *
 * @body completeOn - Completion timestamp (optional, defaults to now)
 */
router.patch('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { completeOn } = req.body;

    const result = await authReq.sunsamaClient.updateTaskComplete(id!, completeOn);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/snooze
 *
 * Update task snooze date (schedule to a day or move to backlog)
 *
 * @body newDay - Date in YYYY-MM-DD format, or null to move to backlog
 * @body timezone - Optional timezone
 */
router.patch('/:id/snooze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { newDay, timezone } = req.body;

    const result = await authReq.sunsamaClient.updateTaskSnoozeDate(id!, newDay, {
      timezone,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/notes
 *
 * Update task notes
 *
 * @body html - HTML content for notes (mutually exclusive with markdown)
 * @body markdown - Markdown content for notes (mutually exclusive with html)
 */
router.patch('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { html, markdown } = req.body;

    if (!html && !markdown) {
      res.status(400).json({
        error: {
          message: 'Either html or markdown content is required',
          code: 'VALIDATION_ERROR',
          status: 400,
        },
      });
      return;
    }

    const content = html ? { html } : { markdown };
    const result = await authReq.sunsamaClient.updateTaskNotes(id!, content);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/planned-time
 *
 * Update task time estimate
 *
 * @body timeEstimate - Time estimate in minutes
 */
router.patch('/:id/planned-time', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { timeEstimate } = req.body;

    if (typeof timeEstimate !== 'number') {
      res.status(400).json({
        error: {
          message: 'timeEstimate must be a number',
          code: 'VALIDATION_ERROR',
          status: 400,
          field: 'timeEstimate',
        },
      });
      return;
    }

    const result = await authReq.sunsamaClient.updateTaskPlannedTime(id!, timeEstimate);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/due-date
 *
 * Update task due date
 *
 * @body dueDate - Due date as ISO string, or null to clear
 */
router.patch('/:id/due-date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { dueDate } = req.body;

    const result = await authReq.sunsamaClient.updateTaskDueDate(id!, dueDate);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/text
 *
 * Update task text/title
 *
 * @body text - New task text
 * @body recommendedStreamId - Optional recommended stream ID
 */
router.patch('/:id/text', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { text, recommendedStreamId } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        error: {
          message: 'text is required',
          code: 'VALIDATION_ERROR',
          status: 400,
          field: 'text',
        },
      });
      return;
    }

    const result = await authReq.sunsamaClient.updateTaskText(id!, text, {
      recommendedStreamId,
    });
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/stream
 *
 * Update task stream assignment
 *
 * @body streamId - Stream ID to assign the task to
 */
router.patch('/:id/stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { streamId } = req.body;

    if (!streamId || typeof streamId !== 'string') {
      res.status(400).json({
        error: {
          message: 'streamId is required',
          code: 'VALIDATION_ERROR',
          status: 400,
          field: 'streamId',
        },
      });
      return;
    }

    const result = await authReq.sunsamaClient.updateTaskStream(id!, streamId);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tasks/:id
 *
 * Delete a task
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const result = await authReq.sunsamaClient.deleteTask(id!);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
