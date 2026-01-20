import { Request, Response } from 'express';
import { BudgetModel } from '../models/Budget';
import pool from '../config/database';

export interface SettlementSuggestion {
  from_account: string;
  to_account: string;
  amount: number;
  reason: string;
}

export interface TransferTransaction {
  id: number;
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  memo: string;
}

export interface SettlementData {
  suggestions: SettlementSuggestion[];
  transfers: TransferTransaction[];
  summary: {
    total_surplus: number;
    total_deficit: number;
    balanced: boolean;
  };
}

export class SettlementController {
  /**
   * 월별 정산 정보 조회
   * - 예산 초과/부족 계좌 분석
   * - 정산 제안 생성
   * - 이체 내역 조회
   */
  static async getSettlement(req: Request, res: Response): Promise<void> {
    try {
      const { month } = req.query;

      if (!month) {
        res.status(400).json({
          ok: false,
          error: 'month 파라미터가 필요합니다. (형식: yyyy-mm)'
        });
        return;
      }

      // 1. 예산 정보 조회 (사용액 포함)
      const budgets = await BudgetModel.findByMonth(month as string);

      // 2. 초과 계좌와 부족 계좌 분류
      const surplusAccounts = budgets
        .filter(b => b.available_amount < 0)
        .map(b => ({
          account: b.account,
          amount: Math.abs(b.available_amount)
        }))
        .sort((a, b) => b.amount - a.amount);

      const deficitAccounts = budgets
        .filter(b => b.available_amount > 0)
        .map(b => ({
          account: b.account,
          amount: b.available_amount
        }))
        .sort((a, b) => b.amount - a.amount);

      // 3. 정산 제안 생성
      const suggestions: SettlementSuggestion[] = [];
      const surplusCopy = [...surplusAccounts];
      const deficitCopy = [...deficitAccounts];

      for (const surplus of surplusCopy) {
        let remaining = surplus.amount;

        for (let i = 0; i < deficitCopy.length && remaining > 0; i++) {
          const deficit = deficitCopy[i];
          if (deficit.amount === 0) continue;

          const transferAmount = Math.min(remaining, deficit.amount);

          suggestions.push({
            from_account: deficit.account,
            to_account: surplus.account,
            amount: transferAmount,
            reason: `${surplus.account} 예산 초과 보충`
          });

          remaining -= transferAmount;
          deficit.amount -= transferAmount;
        }
      }

      // 4. 이체 내역 조회 (카테고리가 '이체'인 거래)
      const [year, monthNum] = (month as string).split('-').map(Number);
      const startDate = `${month}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      const [transferRows] = await pool.execute(
        `SELECT
          id,
          date,
          account as from_account,
          memo,
          amount
        FROM transactions
        WHERE DATE(date) >= ?
          AND DATE(date) <= ?
          AND category IN ('이체', '정산')
        ORDER BY date DESC`,
        [startDate, endDate]
      );

      const transfers = (transferRows as any[]).map(row => ({
        id: row.id,
        date: row.date,
        from_account: row.from_account,
        to_account: extractToAccount(row.memo),
        amount: Number(row.amount),
        memo: row.memo
      }));

      // 5. 요약 정보
      const total_surplus = surplusAccounts.reduce((sum, a) => sum + a.amount, 0);
      const total_deficit = deficitAccounts.reduce((sum, a) => sum + a.amount, 0);

      const settlementData: SettlementData = {
        suggestions,
        transfers,
        summary: {
          total_surplus,
          total_deficit,
          balanced: Math.abs(total_surplus - total_deficit) < 100 // 100원 미만 차이는 균형 잡힘으로 간주
        }
      };

      res.json({
        ok: true,
        data: settlementData
      });
    } catch (error) {
      console.error('정산 정보 조회 오류:', error);
      res.status(500).json({
        ok: false,
        error: '정산 정보를 불러오는데 실패했습니다.'
      });
    }
  }
}

/**
 * 메모에서 받는 계좌 추출
 * 예: "신한은행으로 이체" -> "신한은행"
 */
function extractToAccount(memo: string): string {
  // "XXX로 이체", "XXX에서" 등의 패턴 매칭
  const patterns = [
    /(.+?)로\s*이체/,
    /(.+?)\s*이체/,
    /(.+?)에게/,
    /(.+?)으로/
  ];

  for (const pattern of patterns) {
    const match = memo.match(pattern);
    if (match) return match[1].trim();
  }

  return memo;
}
