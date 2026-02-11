import { Router } from 'express';
import userRoutes from './userRoutes.js';
import healthRoutes from './healthRoutes.js';
import expenseRoutes from './expenseRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import webhookRoutes from './webhookRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/expenses', expenseRoutes);
router.use('/categories', categoryRoutes);
router.use('/payments', paymentRoutes);
router.use('/settings', settingsRoutes);
router.use('/analytics', analyticsRoutes);

export { webhookRoutes };
export default router;
