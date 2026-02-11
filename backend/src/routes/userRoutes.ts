import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { telegramAuth } from '../middleware/telegramAuth.js';

const router = Router();
const userController = new UserController();

// All user routes require Telegram authentication
router.use(telegramAuth);

// GET /api/users/me - Get current user
router.get('/me', userController.getCurrentUser);

// PUT /api/users/me - Update current user
router.put('/me', userController.updateCurrentUser);

export default router;
