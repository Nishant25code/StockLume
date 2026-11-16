/**
 * Mounts every module router under /api.
 * Every module already has its own router file — add endpoints THERE, so
 * teammates rarely need to touch this shared file (fewer merge conflicts).
 */
import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import connectionsRoutes from './connections.routes.js';
import productsRoutes from './products.routes.js';
import inventoryRoutes from './inventory.routes.js';
import salesRoutes from './sales.routes.js';
import predictionsRoutes from './predictions.routes.js';
import ordersRoutes from './orders.routes.js';
import notificationsRoutes from './notifications.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes); // Member 1
router.use('/connections', connectionsRoutes); // Member 1
router.use('/products', productsRoutes); // Member 1
router.use('/inventory', inventoryRoutes); // Member 2
router.use('/sales', salesRoutes); // Member 2
router.use('/predictions', predictionsRoutes); // Member 2
router.use('/orders', ordersRoutes); // Member 3
router.use('/notifications', notificationsRoutes); // Member 4
router.use('/dashboard', dashboardRoutes); // Member 4
router.use('/analytics', analyticsRoutes); // Member 4

export default router;
