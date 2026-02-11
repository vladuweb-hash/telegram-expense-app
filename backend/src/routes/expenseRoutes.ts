import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController.js';
import { telegramAuth } from '../middleware/telegramAuth.js';
import { checkExpenseLimit, checkExportAccess } from '../middleware/premiumCheck.js';

const router = Router();
const expenseController = new ExpenseController();

// Все маршруты требуют Telegram авторизации
router.use(telegramAuth);

// POST /api/expenses - Создать расход (с проверкой лимита)
router.post('/', checkExpenseLimit, expenseController.createExpense);

// GET /api/expenses/today - Расходы за сегодня
router.get('/today', expenseController.getTodayExpenses);

// GET /api/expenses/history - История расходов
router.get('/history', expenseController.getHistory);

// GET /api/expenses/stats - Статистика по категориям
router.get('/stats', expenseController.getStats);

// GET /api/expenses/limits - Информация о лимитах
router.get('/limits', expenseController.getLimits);

// GET /api/expenses/export - Экспорт CSV (только Premium)
router.get('/export', checkExportAccess, expenseController.exportCSV);

// DELETE /api/expenses/:id - Удалить расход
router.delete('/:id', expenseController.deleteExpense);

export default router;
