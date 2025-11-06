import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';

const router = Router();

// 거래 내역 조회 (월별)
router.get('/', TransactionController.getTransactions);

// 거래 내역 생성
router.post('/', TransactionController.createTransaction);

// 거래 내역 수정
router.put('/:id', TransactionController.updateTransaction);

// 거래 내역 삭제
router.delete('/:id', TransactionController.deleteTransaction);

export default router;