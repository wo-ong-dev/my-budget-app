import { Router } from 'express';
import { BudgetController } from '../controllers/budgetController';

const router = Router();

// 예산 조회 (월별)
router.get('/', BudgetController.getBudgetsByMonth);

// 디버그: 모든 예산 조회 (raw DB data)
router.get('/debug/all', BudgetController.getAllBudgetsRaw);

// 예산 생성 또는 업데이트 (upsert)
router.post('/', BudgetController.createOrUpdateBudget);

// 예산 순서 업데이트 (드래그앤드롭)
router.post('/sort-order', BudgetController.updateSortOrder);

// 예산 수정
router.put('/:id', BudgetController.updateBudget);

// 예산 삭제
router.delete('/:id', BudgetController.deleteBudget);

export default router;
