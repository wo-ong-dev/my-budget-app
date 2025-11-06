import { Router } from 'express';
import { AccountController } from '../controllers/accountController';

const router = Router();

router.get('/', AccountController.getAccounts);
router.post('/', AccountController.createAccount);
router.delete('/:id', AccountController.deleteAccount);

export default router;
