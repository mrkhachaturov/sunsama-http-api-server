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
 * @openapi
 * /api/user:
 *   get:
 *     summary: Get current user
 *     description: Retrieves information about the authenticated user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
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
 * @openapi
 * /api/user/timezone:
 *   get:
 *     summary: Get user timezone
 *     description: Retrieves the authenticated user's configured timezone
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User timezone
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     timezone:
 *                       type: string
 *                       example: "America/New_York"
 *       401:
 *         description: Unauthorized
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
