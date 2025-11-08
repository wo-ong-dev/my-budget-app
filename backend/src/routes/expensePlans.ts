import { Router } from 'express';
import { ExpensePlanController } from '../controllers/expensePlanController';

const router = Router();

// GET /api/expense-plans?month=2025-11&account=국민은행
router.get('/', ExpensePlanController.getPlans);

// GET /api/expense-plans/total?month=2025-11&account=국민은행
router.get('/total', ExpensePlanController.getPlannedTotal);

// POST /api/expense-plans
router.post('/', ExpensePlanController.createPlan);

// PUT /api/expense-plans/:id
router.put('/:id', ExpensePlanController.updatePlan);

// DELETE /api/expense-plans/:id
router.delete('/:id', ExpensePlanController.deletePlan);

export default router;
