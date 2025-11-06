import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';

const router = Router();

router.get('/', CategoryController.getCategories);
router.post('/', CategoryController.createCategory);
router.delete('/:id', CategoryController.deleteCategory);

export default router;
