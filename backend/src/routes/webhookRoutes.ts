import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';

const router = Router();
const paymentController = new PaymentController();

// POST /webhook/telegram - Webhook от Telegram (без авторизации)
router.post('/telegram', paymentController.handleWebhook);

export default router;
