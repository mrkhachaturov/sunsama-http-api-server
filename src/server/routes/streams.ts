/**
 * Streams routes
 *
 * Stream/project management endpoints.
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
 * /api/streams:
 *   get:
 *     summary: Get all streams
 *     description: Retrieves all streams (projects/channels) for the user's group
 *     tags: [Streams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of streams
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stream'
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const streams = await authReq.sunsamaClient.getStreamsByGroupId();
    res.json({ data: streams });
  } catch (error) {
    next(error);
  }
});

export default router;
