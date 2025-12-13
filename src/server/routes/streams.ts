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
 * GET /api/streams
 *
 * Get all streams for the user's group
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
