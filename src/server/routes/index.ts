/**
 * Route aggregator
 *
 * Combines all API routes into a single router.
 */

import { Router, type Router as RouterType } from 'express';
import tasksRouter from './tasks.js';
import userRouter from './user.js';
import streamsRouter from './streams.js';

const router: RouterType = Router();

// Mount routes
router.use('/tasks', tasksRouter);
router.use('/user', userRouter);
router.use('/streams', streamsRouter);

export default router;
