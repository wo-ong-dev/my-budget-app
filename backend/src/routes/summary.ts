import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';

const router = Router();

// 월별 요약 정보 조회
router.get('/', TransactionController.getSummary);

export default router;