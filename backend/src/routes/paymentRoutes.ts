import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { telegramAuth } from '../middleware/telegramAuth.js';

const router = Router();
const paymentController = new PaymentController();

// Маршруты требуют Telegram авторизации
router.use(telegramAuth);

// POST /api/payments/create-invoice - Создать инвойс
router.post('/create-invoice', paymentController.createInvoice);

// GET /api/payments/premium-info - Информация о Premium
router.get('/premium-info', paymentController.getPremiumInfo);

// GET /api/payments/history - История платежей
router.get('/history', paymentController.getPaymentHistory);

export default router;
