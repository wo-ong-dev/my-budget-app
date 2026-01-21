import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController';
import { RebalanceController } from '../controllers/rebalanceController';

const router = Router();

// GET /api/settlements?month=yyyy-mm
router.get('/', SettlementController.getSettlement);

// GET /api/settlements/rebalance?month=yyyy-mm
router.get('/rebalance', RebalanceController.getRebalanceSuggestions);

// POST /api/settlements/rebalance/commit
router.post('/rebalance/commit', RebalanceController.commitRebalance);

export default router;
