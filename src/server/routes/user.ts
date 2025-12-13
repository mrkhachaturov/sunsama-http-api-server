/**
 * User routes
 *
 * User information endpoints.
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
 * GET /api/user
 *
 * Get current user information
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await authReq.sunsamaClient.getUser();
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/timezone
 *
 * Get user's timezone
 */
router.get('/timezone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const timezone = await authReq.sunsamaClient.getUserTimezone();
    res.json({ data: { timezone } });
  } catch (error) {
    next(error);
  }
});

export default router;
