import { Request, Response } from 'express';
import { BudgetModel, BudgetDraft } from '../models/Budget';
import pool from '../config/database';

export class BudgetController {
  // 디버그용: 모든 예산 raw 데이터 조회
  static async getAllBudgetsRaw(req: Request, res: Response): Promise<void> {
    try {
      const [rows] = await pool.execute('SELECT * FROM budgets ORDER BY month DESC, account');
      res.json({
        ok: true,
        count: (rows as any[]).length,
        budgets: rows
      });
    } catch (error) {
      console.error('디버그 조회 오류:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  }

  static async getBudgetsByMonth(req: Request, res: Response): Promise<void> {
    try {
      const { month } = req.query;

      if (!month) {
        res.status(400).json({
          ok: false,
          error: 'month 파라미터가 필요합니다. (형식: yyyy-mm)'
        });
        return;
      }

      const budgets = await BudgetModel.findByMonth(month as string);

      res.json({
        ok: true,
        budgets
      });
    } catch (error) {
      console.error('예산 조회 오류:', error);
      res.status(500).json({
        ok: false,
        error: '예산 정보를 불러오는데 실패했습니다.'
      });
    }
  }

  static async createOrUpdateBudget(req: Request, res: Response): Promise<void> {
    try {
      const budgetData: BudgetDraft = req.body;

      if (!budgetData.account || !budgetData.month || !budgetData.target_amount) {
        res.status(400).json({
          ok: false,
          error: '계좌명, 월, 목표금액은 필수 입력 항목입니다.'
        });
        return;
      }

      if (budgetData.target_amount <= 0) {
        res.status(400).json({
          ok: false,
          error: '목표금액은 0보다 커야 합니다.'
        });
        return;
      }

      const budget = await BudgetModel.create(budgetData);

      res.status(201).json({
        ok: true,
        data: budget
      });
    } catch (error) {
      console.error('예산 생성 오류:', error);
      res.status(500).json({
        ok: false,
        error: '예산을 저장하는데 실패했습니다.'
      });
    }
  }

  static async updateBudget(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const budgetData: Partial<BudgetDraft> = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          ok: false,
          error: '유효한 ID가 필요합니다.'
        });
        return;
      }

      const budget = await BudgetModel.update(Number(id), budgetData);

      res.json({
        ok: true,
        data: budget
      });
    } catch (error) {
      console.error('예산 수정 오류:', error);
      res.status(500).json({
        ok: false,
        error: '예산을 수정하는데 실패했습니다.'
      });
    }
  }

  static async deleteBudget(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          ok: false,
          error: '유효한 ID가 필요합니다.'
        });
        return;
      }

      await BudgetModel.delete(Number(id));

      res.json({
        ok: true,
        message: '예산이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('예산 삭제 오류:', error);
      res.status(500).json({
        ok: false,
        error: '예산을 삭제하는데 실패했습니다.'
      });
    }
  }

  // 예산 순서 업데이트 (드래그앤드롭)
  static async updateSortOrder(req: Request, res: Response): Promise<void> {
    try {
      const { month, orderedAccounts } = req.body;

      if (!month || !orderedAccounts || !Array.isArray(orderedAccounts)) {
        res.status(400).json({
          ok: false,
          error: 'month와 orderedAccounts 배열이 필요합니다.'
        });
        return;
      }

      await BudgetModel.updateSortOrder(month, orderedAccounts);

      res.json({
        ok: true,
        message: '예산 순서가 업데이트되었습니다.'
      });
    } catch (error) {
      console.error('예산 순서 업데이트 오류:', error);
      res.status(500).json({
        ok: false,
        error: '예산 순서를 업데이트하는데 실패했습니다.'
      });
    }
  }
}
