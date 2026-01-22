import { Request, Response } from 'express';
import { TransactionModel, TransactionDraft } from '../models/Transaction';
import pool from '../config/database';

export class TransactionController {
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        res.status(400).json({
          ok: false,
          error: 'from과 to 파라미터가 필요합니다.'
        });
        return;
      }
      
      const transactions = await TransactionModel.findByMonthRange(
        from as string, 
        to as string
      );
      
      res.json({
        ok: true,
        rows: transactions
      });
    } catch (error) {
      console.error('거래 내역 조회 오류:', error);
      res.status(500).json({
        ok: false,
        error: '거래 내역을 불러오는데 실패했습니다.'
      });
    }
  }

  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const transactionData: TransactionDraft = req.body;

      // 필수 필드 검증 (amount는 0도 허용하므로 undefined/null만 체크)
      if (!transactionData.date || !transactionData.type || transactionData.amount === undefined || transactionData.amount === null) {
        res.status(400).json({
          ok: false,
          error: '날짜, 유형, 금액은 필수 입력 항목입니다.'
        });
        return;
      }

      if (transactionData.amount <= 0) {
        res.status(400).json({
          ok: false,
          error: '금액은 0보다 커야 합니다.'
        });
        return;
      }
      
      const transaction = await TransactionModel.create(transactionData);
      
      res.status(201).json({
        ok: true,
        data: transaction
      });
    } catch (error) {
      console.error('거래 내역 생성 오류:', error);
      res.status(500).json({
        ok: false,
        error: '거래 내역을 저장하는데 실패했습니다.'
      });
    }
  }

  static async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const transactionData: TransactionDraft = req.body;
      
      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          ok: false,
          error: '유효한 ID가 필요합니다.'
        });
        return;
      }
      
      const transaction = await TransactionModel.update(Number(id), transactionData);
      
      res.json({
        ok: true,
        data: transaction
      });
    } catch (error) {
      console.error('거래 내역 수정 오류:', error);
      res.status(500).json({
        ok: false,
        error: '거래 내역을 수정하는데 실패했습니다.'
      });
    }
  }

  static async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id || isNaN(Number(id))) {
        res.status(400).json({
          ok: false,
          error: '유효한 ID가 필요합니다.'
        });
        return;
      }
      
      await TransactionModel.delete(Number(id));
      
      res.json({
        ok: true,
        message: '거래 내역이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('거래 내역 삭제 오류:', error);
      res.status(500).json({
        ok: false,
        error: '거래 내역을 삭제하는데 실패했습니다.'
      });
    }
  }

  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        res.status(400).json({
          ok: false,
          error: 'from과 to 파라미터가 필요합니다.'
        });
        return;
      }
      
      const summary = await TransactionModel.getSummary(
        from as string, 
        to as string
      );
      
      res.json({
        ok: true,
        summary
      });
    } catch (error) {
      console.error('요약 정보 조회 오류:', error);
      res.status(500).json({
        ok: false,
        error: '요약 정보를 불러오는데 실패했습니다.'
      });
    }
  }

  /**
   * 중복 거래 내역 삭제 (관리자용)
   * POST /api/transactions/remove-duplicates
   */
  static async removeDuplicates(req: Request, res: Response): Promise<void> {
    try {
      const conn = await pool.getConnection();
      try {
        // 1. 중복 항목 확인
        const [duplicates] = await conn.query(`
          SELECT 
            date, type, amount, account, category, memo, COUNT(*) as cnt
          FROM transactions
          GROUP BY date, type, amount, account, category, memo
          HAVING COUNT(*) > 1
          ORDER BY cnt DESC
          LIMIT 20
        `);

        if ((duplicates as any[]).length === 0) {
          res.json({
            ok: true,
            data: {
              message: '중복 항목이 없습니다.',
              deleted_count: 0,
              before_total: 0,
              after_total: 0
            }
          });
          return;
        }

        // 2. 삭제 전 총 개수 확인
        const [beforeCount] = await conn.query('SELECT COUNT(*) as cnt FROM transactions');
        const beforeTotal = (beforeCount as any[])[0].cnt;

        // 3. 중복 항목 삭제 (가장 작은 id만 유지)
        const [result] = await conn.query(`
          DELETE t1 FROM transactions t1
          INNER JOIN transactions t2
          WHERE t1.id > t2.id
            AND t1.date = t2.date
            AND t1.type = t2.type
            AND ABS(t1.amount - t2.amount) < 0.01
            AND (t1.account = t2.account OR (t1.account IS NULL AND t2.account IS NULL))
            AND (t1.category = t2.category OR (t1.category IS NULL AND t2.category IS NULL))
            AND (t1.memo = t2.memo OR (t1.memo IS NULL AND t2.memo IS NULL))
        `);

        const deletedCount = (result as any).affectedRows;

        // 4. 삭제 후 총 개수 확인
        const [afterCount] = await conn.query('SELECT COUNT(*) as cnt FROM transactions');
        const afterTotal = (afterCount as any[])[0].cnt;

        // 5. 최종 중복 확인
        const [finalCheck] = await conn.query(`
          SELECT COUNT(*) as cnt
          FROM (
            SELECT date, type, amount, account, category, memo
            FROM transactions
            GROUP BY date, type, amount, account, category, memo
            HAVING COUNT(*) > 1
          ) as dup
        `);

        res.json({
          ok: true,
          data: {
            message: deletedCount > 0 
              ? `중복 항목 ${deletedCount}개가 삭제되었습니다.`
              : '중복 항목이 없습니다.',
            deleted_count: deletedCount,
            before_total: beforeTotal,
            after_total: afterTotal,
            remaining_duplicates: (finalCheck as any[])[0].cnt
          }
        });
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('중복 항목 삭제 오류:', error);
      res.status(500).json({
        ok: false,
        error: '중복 항목 삭제에 실패했습니다.'
      });
    }
  }
}