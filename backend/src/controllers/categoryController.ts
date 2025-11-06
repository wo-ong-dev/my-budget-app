import { Request, Response } from 'express';
import { CategoryModel } from '../models/Category';

export class CategoryController {
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await CategoryModel.findAll();
      res.json({ ok: true, rows: categories });
    } catch (error) {
      console.error('카테고리 목록 조회 실패:', error);
      res.status(500).json({ ok: false, error: '카테고리 목록을 불러오지 못했어요.' });
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { name, type } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ ok: false, error: '카테고리명은 필수 입력 항목입니다.' });
        return;
      }

      if (!type || (type !== '수입' && type !== '지출')) {
        res.status(400).json({ ok: false, error: '카테고리 타입은 "수입" 또는 "지출"이어야 합니다.' });
        return;
      }

      // Check if category already exists
      const existing = await CategoryModel.findByName(name);
      if (existing) {
        res.status(409).json({ ok: false, error: '이미 존재하는 카테고리입니다.' });
        return;
      }

      const category = await CategoryModel.create(name, type);
      res.status(201).json({ ok: true, data: category });
    } catch (error) {
      console.error('카테고리 생성 실패:', error);
      res.status(500).json({ ok: false, error: '카테고리를 생성하지 못했어요.' });
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({ ok: false, error: '유효한 ID가 필요합니다.' });
        return;
      }

      await CategoryModel.delete(Number(id));
      res.json({ ok: true, message: '카테고리가 삭제되었습니다.' });
    } catch (error) {
      console.error('카테고리 삭제 실패:', error);
      res.status(500).json({ ok: false, error: '카테고리를 삭제하지 못했어요.' });
    }
  }
}
