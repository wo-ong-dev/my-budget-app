import { Router } from 'express';
import { SettlementController } from '../controllers/settlementController';

const router = Router();

// GET /api/settlements?month=yyyy-mm
router.get('/', SettlementController.getSettlement);

export default router;
