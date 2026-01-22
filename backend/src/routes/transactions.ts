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

// 중복 거래 내역 삭제 (관리자용)
router.post('/remove-duplicates', TransactionController.removeDuplicates);

// 날짜+메모+금액 기준 중복 항목 삭제 (관리자용)
router.post('/remove-duplicates-by-date-memo-amount', TransactionController.removeDuplicatesByDateMemoAmount);

export default router;