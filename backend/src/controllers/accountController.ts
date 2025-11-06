import { Request, Response } from 'express';
import { AccountModel } from '../models/Account';

export class AccountController {
  static async getAccounts(req: Request, res: Response): Promise<void> {
    try {
      const accounts = await AccountModel.findAll();
      res.json({ ok: true, rows: accounts });
    } catch (error) {
      console.error('계좌 목록 조회 실패:', error);
      res.status(500).json({ ok: false, error: '계좌 목록을 불러오지 못했어요.' });
    }
  }

  static async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ ok: false, error: '계좌명은 필수 입력 항목입니다.' });
        return;
      }

      // Check if account already exists
      const existing = await AccountModel.findByName(name);
      if (existing) {
        res.status(409).json({ ok: false, error: '이미 존재하는 계좌입니다.' });
        return;
      }

      const account = await AccountModel.create(name);
      res.status(201).json({ ok: true, data: account });
    } catch (error) {
      console.error('계좌 생성 실패:', error);
      res.status(500).json({ ok: false, error: '계좌를 생성하지 못했어요.' });
    }
  }

  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || isNaN(Number(id))) {
        res.status(400).json({ ok: false, error: '유효한 ID가 필요합니다.' });
        return;
      }

      await AccountModel.delete(Number(id));
      res.json({ ok: true, message: '계좌가 삭제되었습니다.' });
    } catch (error) {
      console.error('계좌 삭제 실패:', error);
      res.status(500).json({ ok: false, error: '계좌를 삭제하지 못했어요.' });
    }
  }
}
