import { Request, Response } from 'express';
import { ExpensePlanModel, ExpensePlanDraft } from '../models/ExpensePlan';

const TEMPLATE_MONTH = process.env.EXPENSE_PLAN_TEMPLATE_MONTH || '2025-11';

export class ExpensePlanController {
  static async getPlans(req: Request, res: Response): Promise<void> {
    try {
      const { month, account } = req.query;

      if (!month) {
        res.status(400).json({
          ok: false,
          error: 'month 파라미터가 필요합니다.'
        });
        return;
      }

      const targetMonth = month as string;

      // 템플릿 월이 아니면 먼저 템플릿 기반 항목을 복제 (이미 있는 건 그대로 두고, 없는 것만 생성)
      if (targetMonth !== TEMPLATE_MONTH) {
        await ExpensePlanModel.cloneMonthPlans(
          TEMPLATE_MONTH,
          targetMonth
        );
      }

      let plans;
      if (account) {
        plans = await ExpensePlanModel.findByAccountAndMonth(account as string, targetMonth);
      } else {
        plans = await ExpensePlanModel.findByMonth(targetMonth);
      }

      res.json({
        ok: true,
        plans
      });
    } catch (error) {
      console.error('지출 계획 조회 오류:', error);
      res.status(500).json({
        ok: false,
        error: '지출 계획을 불러오는데 실패했습니다.'
      });
    }
  }

  static async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const planData: ExpensePlanDraft = req.body;

      if (!planData.account || !planData.month || !planData.name || !planData.amount) {
        res.status(400).json({
          ok: false,
          error: '필수 항목을 입력해주세요.'
        });
        return;
      }

      const plan = await ExpensePlanModel.create(planData);

      res.status(201).json({
        ok: true,
        data: plan
      });
    } catch (error) {
      console.error('지출 계획 생성 오류:', error);
      res.status(500).json({
        ok: false,
        error: '지출 계획을 저장하는데 실패했습니다.'
      });
    }
  }

  static async updatePlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          ok: false,
          error: '유효한 ID가 필요합니다.'
        });
        return;
      }

      const plan = await ExpensePlanModel.update(Number(id), updates);

      res.json({
        ok: true,
        data: plan
      });
    } catch (error) {
      console.error('지출 계획 수정 오류:', error);
      res.status(500).json({
        ok: false,
        error: '지출 계획을 수정하는데 실패했습니다.'
      });
    }
  }

  static async deletePlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          ok: false,
          error: '유효한 ID가 필요합니다.'
        });
        return;
      }

      await ExpensePlanModel.delete(Number(id));

      res.json({
        ok: true,
        message: '지출 계획이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('지출 계획 삭제 오류:', error);
      res.status(500).json({
        ok: false,
        error: '지출 계획을 삭제하는데 실패했습니다.'
      });
    }
  }

  static async getPlannedTotal(req: Request, res: Response): Promise<void> {
    try {
      const { month, account } = req.query;

      if (!month || !account) {
        res.status(400).json({
          ok: false,
          error: 'month, account 파라미터가 필요합니다.'
        });
        return;
      }

      const total = await ExpensePlanModel.getTotalPlannedByAccountAndMonth(
        account as string,
        month as string
      );
      const checked = await ExpensePlanModel.getCheckedTotalByAccountAndMonth(
        account as string,
        month as string
      );

      res.json({
        ok: true,
        data: {
          total_planned: total,
          checked_total: checked,
          remaining: total - checked
        }
      });
    } catch (error) {
      console.error('계획 금액 조회 오류:', error);
      res.status(500).json({
        ok: false,
        error: '계획 금액을 불러오는데 실패했습니다.'
      });
    }
  }
}
