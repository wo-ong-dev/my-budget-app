import { Request, Response } from 'express';
import { TransactionModel, TransactionDraft } from '../models/Transaction';

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
}