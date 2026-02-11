import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController.js';
import { telegramAuth } from '../middleware/telegramAuth.js';
import { checkCustomCategoryAccess } from '../middleware/premiumCheck.js';

const router = Router();
const categoryController = new CategoryController();

// Все маршруты требуют Telegram авторизации
router.use(telegramAuth);

// GET /api/categories - Получить все категории (доступно всем)
router.get('/', categoryController.getCategories);

// POST /api/categories - Создать кастомную категорию (только Premium)
router.post('/', checkCustomCategoryAccess, categoryController.createCategory);

// PUT /api/categories/:id - Обновить категорию (только Premium)
router.put('/:id', checkCustomCategoryAccess, categoryController.updateCategory);

// DELETE /api/categories/:id - Удалить категорию (только Premium)
router.delete('/:id', checkCustomCategoryAccess, categoryController.deleteCategory);

export default router;
