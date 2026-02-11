import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';
import { telegramAuth } from '../middleware/telegramAuth.js';

const router = Router();
const settingsController = new SettingsController();

// Все маршруты требуют Telegram авторизации
router.use(telegramAuth);

// GET /api/settings - Получить все настройки
router.get('/', settingsController.getAllSettings);

// GET /api/settings/notifications - Получить настройки уведомлений
router.get('/notifications', settingsController.getNotificationSettings);

// PUT /api/settings/notifications - Обновить настройки уведомлений
router.put('/notifications', settingsController.updateNotificationSettings);

export default router;
