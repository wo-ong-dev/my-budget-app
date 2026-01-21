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
   * - 리밸런싱 완료 항목 중 실제 계좌 이체 미완료 항목만 조회 (정산제안)
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

      // 1. 리밸런싱 완료 항목 중 실제 계좌 이체 미완료 항목 조회 (정산제안)
      const [feedbackRows] = await pool.execute(
        `SELECT
          rf.transaction_id,
          rf.original_account,
          rf.suggested_account,
          rf.corrected_account,
          rf.category,
          rf.memo,
          rf.created_at,
          t.date,
          t.amount
        FROM rebalance_feedback rf
        INNER JOIN transactions t ON rf.transaction_id = t.id
        WHERE rf.month = ?
          AND rf.decision = 'APPLY'
          AND rf.is_settled = FALSE
        ORDER BY rf.created_at DESC`,
        [month]
      );

      const suggestions: SettlementSuggestion[] = (feedbackRows as any[]).map(row => {
        const fromAccount = row.original_account;
        const toAccount = row.corrected_account ?? row.suggested_account;
        const memoText = row.memo ? ` - ${row.memo}` : '';
        return {
          from_account: fromAccount,
          to_account: toAccount,
          amount: Number(row.amount),
          reason: `리밸런싱 보정${memoText}`
        };
      });

      // 2. 이체 내역 조회 (카테고리가 '이체' 또는 '정산'인 거래)
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

      // 3. 요약 정보 (리밸런싱 완료 항목 기준)
      const totalAmount = suggestions.reduce((sum, s) => sum + s.amount, 0);

      const settlementData: SettlementData = {
        suggestions,
        transfers,
        summary: {
          total_surplus: totalAmount,
          total_deficit: 0,
          balanced: totalAmount === 0
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

  /**
   * 정산제안 완료 (실제 계좌 이체 완료 표시)
   * POST /api/settlements/apply
   */
  static async applySettlement(req: Request, res: Response): Promise<void> {
    try {
      const { month, item_keys } = req.body;

      if (!month || typeof month !== 'string') {
        res.status(400).json({
          ok: false,
          error: 'month 파라미터가 필요합니다.'
        });
        return;
      }

      if (!Array.isArray(item_keys) || item_keys.length === 0) {
        res.status(400).json({
          ok: false,
          error: 'item_keys 배열이 필요합니다.'
        });
        return;
      }

      // item_keys 형식: "from_account-to_account-amount" (예: "토스뱅크-카카오뱅크-139200")
      // 계좌명에 '-'가 포함될 수 있으므로 마지막 2개 요소만 분리
      // rebalance_feedback에서 매칭하여 is_settled=true로 업데이트
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        let updatedCount = 0;
        for (const key of item_keys) {
          const parts = key.split('-');
          if (parts.length < 3) {
            console.warn(`잘못된 key 형식: ${key}`);
            continue;
          }

          // 마지막 2개: to_account, amount
          const toAccount = parts[parts.length - 2];
          const amountStr = parts[parts.length - 1];
          const amount = parseInt(amountStr, 10);

          if (Number.isNaN(amount)) {
            console.warn(`잘못된 amount: ${amountStr} in key: ${key}`);
            continue;
          }

          // 나머지: from_account (계좌명에 '-' 포함 가능)
          const fromAccount = parts.slice(0, -2).join('-');

          // 해당 월의 리밸런싱 완료 항목 중 매칭되는 항목 찾기
          const [rows] = await conn.execute(
            `SELECT rf.id, rf.transaction_id
             FROM rebalance_feedback rf
             INNER JOIN transactions t ON rf.transaction_id = t.id
             WHERE rf.month = ?
               AND rf.decision = 'APPLY'
               AND rf.is_settled = FALSE
               AND rf.original_account = ?
               AND (rf.corrected_account = ? OR (rf.corrected_account IS NULL AND rf.suggested_account = ?))
               AND ABS(t.amount - ?) < 0.01`,
            [month, fromAccount, toAccount, toAccount, amount]
          );

          const matched = (rows as any[])[0];
          if (matched) {
            await conn.execute(
              `UPDATE rebalance_feedback SET is_settled = TRUE WHERE id = ?`,
              [matched.id]
            );
            updatedCount++;
          } else {
            console.warn(`매칭되지 않은 항목: ${key} (from: ${fromAccount}, to: ${toAccount}, amount: ${amount})`);
          }
        }

        await conn.commit();

        res.json({
          ok: true,
          data: {
            month,
            updated_count: updatedCount,
            total_requested: item_keys.length
          }
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('정산제안 완료 처리 오류:', error);
      res.status(500).json({
        ok: false,
        error: '정산제안 완료 처리에 실패했습니다.'
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
