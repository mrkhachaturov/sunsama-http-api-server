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
 * @openapi
 * /api/tasks/day/{date}:
 *   get:
 *     summary: Get tasks for a specific day
 *     description: Retrieves all tasks scheduled for the specified date
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: path
 *         required: true
 *         description: Date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *           example: "2024-01-15"
 *       - name: timezone
 *         in: query
 *         required: false
 *         description: Timezone for date interpretation
 *         schema:
 *           type: string
 *           example: "America/New_York"
 *     responses:
 *       200:
 *         description: List of tasks for the day
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /api/tasks/backlog:
 *   get:
 *     summary: Get backlog tasks
 *     description: Retrieves all tasks in the backlog (not scheduled to a specific day)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of backlog tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
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
 * @openapi
 * /api/tasks/archived:
 *   get:
 *     summary: Get archived tasks
 *     description: Retrieves archived/completed tasks with pagination support
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: offset
 *         in: query
 *         required: false
 *         description: Offset for pagination
 *         schema:
 *           type: integer
 *           default: 0
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of tasks to return
 *         schema:
 *           type: integer
 *           default: 300
 *     responses:
 *       200:
 *         description: List of archived tasks with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     offset:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         description: Unauthorized
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
 * @openapi
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     description: Retrieves a specific task by its ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
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
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Creates a new task with the provided details
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Task text/title
 *                 example: "Review pull request"
 *               notes:
 *                 type: string
 *                 description: Task notes (HTML or plain text)
 *               timeEstimate:
 *                 type: integer
 *                 description: Time estimate in minutes
 *                 example: 30
 *               streamIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of stream IDs to assign
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Due date as ISO string
 *               snoozeUntil:
 *                 type: string
 *                 format: date-time
 *                 description: Schedule task to this date
 *               taskId:
 *                 type: string
 *                 description: Custom task ID
 *               private:
 *                 type: boolean
 *                 description: Whether the task is private
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
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
 * @openapi
 * /api/tasks/{id}/complete:
 *   patch:
 *     summary: Mark task as complete
 *     description: Marks a task as completed with optional completion timestamp
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completeOn:
 *                 type: string
 *                 format: date-time
 *                 description: Completion timestamp (defaults to now)
 *     responses:
 *       200:
 *         description: Task marked as complete
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}/snooze:
 *   patch:
 *     summary: Update task schedule
 *     description: Reschedule task to a specific day or move to backlog
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newDay:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: Date in YYYY-MM-DD format, or null to move to backlog
 *                 example: "2024-01-15"
 *               timezone:
 *                 type: string
 *                 description: Timezone for date interpretation
 *                 example: "America/New_York"
 *     responses:
 *       200:
 *         description: Task rescheduled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}/notes:
 *   patch:
 *     summary: Update task notes
 *     description: Update the notes/description of a task. Provide either HTML or Markdown content.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               html:
 *                 type: string
 *                 description: HTML content for notes (mutually exclusive with markdown)
 *               markdown:
 *                 type: string
 *                 description: Markdown content for notes (mutually exclusive with html)
 *     responses:
 *       200:
 *         description: Notes updated successfully
 *       400:
 *         description: Validation error - must provide html or markdown
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}/planned-time:
 *   patch:
 *     summary: Update time estimate
 *     description: Update the planned time estimate for a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timeEstimate
 *             properties:
 *               timeEstimate:
 *                 type: integer
 *                 description: Time estimate in minutes
 *                 example: 45
 *     responses:
 *       200:
 *         description: Time estimate updated
 *       400:
 *         description: Validation error - timeEstimate must be a number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}/due-date:
 *   patch:
 *     summary: Update due date
 *     description: Update or clear the due date for a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: Due date as ISO string, or null to clear
 *     responses:
 *       200:
 *         description: Due date updated
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}/text:
 *   patch:
 *     summary: Update task title
 *     description: Update the text/title of a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: New task text/title
 *                 example: "Updated task title"
 *               recommendedStreamId:
 *                 type: string
 *                 description: Optional recommended stream ID
 *     responses:
 *       200:
 *         description: Task title updated
 *       400:
 *         description: Validation error - text is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}/stream:
 *   patch:
 *     summary: Update stream assignment
 *     description: Assign a task to a different stream/project
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - streamId
 *             properties:
 *               streamId:
 *                 type: string
 *                 description: Stream ID to assign the task to
 *     responses:
 *       200:
 *         description: Stream assignment updated
 *       400:
 *         description: Validation error - streamId is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Permanently deletes a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Task ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
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
