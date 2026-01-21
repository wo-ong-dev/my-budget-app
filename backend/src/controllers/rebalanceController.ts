import { Request, Response } from 'express';
import { TransactionModel } from '../models/Transaction';
import pool from '../config/database';
import {
  computeSuggestedAccount,
  insertFeedback,
  normalizeOverridePatternKey,
  upsertOverride,
  RebalanceSuggestionItem
} from '../services/rebalanceService';

function monthToRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { from: startDate, to: endDate };
}

export class RebalanceController {
  /**
   * 거래 단위 리밸런싱 정산 제안 조회
   * GET /api/settlements/rebalance?month=yyyy-mm
   */
  static async getRebalanceSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { month } = req.query;
      if (!month || typeof month !== 'string') {
        res.status(400).json({ ok: false, error: 'month 파라미터가 필요합니다. (형식: yyyy-mm)' });
        return;
      }

      const { from, to } = monthToRange(month);
      const txs = await TransactionModel.findByMonthRange(from, to);

      // 이미 리밸런싱 완료된 항목(decision='APPLY') 제외
      const [completedRows] = await pool.execute(
        `SELECT transaction_id FROM rebalance_feedback
         WHERE month = ? AND decision = 'APPLY'`,
        [month]
      );
      const completedTxIds = new Set((completedRows as any[]).map(r => r.transaction_id));

      const suggestions: RebalanceSuggestionItem[] = [];
      for (const tx of txs) {
        if (tx.type !== '지출') continue;
        if (!tx.account) continue;
        if (completedTxIds.has(tx.id)) continue; // 이미 리밸런싱 완료된 항목 제외

        // 이체/정산 카테고리는 리밸런싱 대상에서 제외
        if (tx.category === '이체' || tx.category === '정산') continue;

        const { suggested, reason, patternKey } = await computeSuggestedAccount(tx);
        if (!suggested) continue;

        if (suggested !== tx.account) {
          suggestions.push({
            transaction_id: tx.id,
            date: tx.date,
            type: tx.type,
            amount: Number(tx.amount),
            category: tx.category ?? null,
            memo: tx.memo ?? null,
            original_account: tx.account ?? null,
            suggested_account: suggested,
            pattern_key: patternKey,
            reason
          });
        }
      }

      res.json({
        ok: true,
        data: {
          month,
          total: suggestions.length,
          suggestions
        }
      });
    } catch (error) {
      console.error('리밸런싱 제안 조회 오류:', error);
      res.status(500).json({ ok: false, error: '리밸런싱 제안을 불러오는데 실패했습니다.' });
    }
  }

  /**
   * 정산 세션 커밋(완료/보류/틀림)
   * POST /api/settlements/rebalance/commit
   */
  static async commitRebalance(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      month: string;
      decisions: Array<{
        transactionId: number;
        decision: 'APPLY' | 'DEFER' | 'WRONG';
        chosenAccount?: string | null;
        learningScope?: 'NONE' | 'PATTERN' | 'CATEGORY';
      }>;
    };

    try {
      if (!body?.month || typeof body.month !== 'string') {
        res.status(400).json({ ok: false, error: 'month가 필요합니다.' });
        return;
      }
      if (!Array.isArray(body.decisions) || body.decisions.length === 0) {
        res.status(400).json({ ok: false, error: 'decisions가 필요합니다.' });
        return;
      }

      // 트랜잭션 처리
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const results: Array<{ transactionId: number; decision: string; applied?: boolean }> = [];

        for (const d of body.decisions) {
          const txId = Number(d.transactionId);
          if (!txId || Number.isNaN(txId)) continue;

          const [rows] = await conn.execute('SELECT * FROM transactions WHERE id = ?', [txId]);
          const tx = (rows as any[])[0];
          if (!tx) continue;

          const originalAccount = tx.account ?? null;
          const category = tx.category ?? null;
          const memo = tx.memo ?? null;

          // 현재 추천값 계산(로그/학습용)
          const { suggested, patternKey } = await computeSuggestedAccount({
            id: tx.id,
            date: tx.date,
            type: tx.type,
            account: tx.account,
            category: tx.category,
            amount: Number(tx.amount),
            memo: tx.memo
          });

          const chosenAccount = typeof d.chosenAccount === 'string' ? d.chosenAccount : null;
          const learningScope: 'NONE' | 'PATTERN' | 'CATEGORY' =
            d.learningScope === 'CATEGORY' || d.learningScope === 'PATTERN' || d.learningScope === 'NONE'
              ? d.learningScope
              : d.decision === 'WRONG'
                ? 'PATTERN'
                : 'NONE';

          // 1) 피드백 로그 저장
          await insertFeedback({
            month: body.month,
            transactionId: txId,
            originalAccount,
            category,
            memo,
            suggestedAccount: suggested,
            decision: d.decision,
            correctedAccount: chosenAccount
          });

          // 2) 학습(틀림 또는 완료-수정)
          const normalizedPatternKey = normalizeOverridePatternKey(learningScope, patternKey);
          if (category && normalizedPatternKey && chosenAccount && (d.decision === 'WRONG' || (suggested && chosenAccount !== suggested))) {
            await upsertOverride(category, normalizedPatternKey, chosenAccount);
          }

          // 3) 적용(완료)
          if (d.decision === 'APPLY') {
            const finalAccount = chosenAccount ?? suggested;
            if (!finalAccount || !originalAccount) {
              results.push({ transactionId: txId, decision: d.decision, applied: false });
              continue;
            }

            // (A) 보정 이체 거래 생성: from=originalAccount, memo에 to 계좌를 넣어 기존 transfer 표시 로직 재사용
            await conn.execute(
              `INSERT INTO transactions (date, type, account, category, amount, memo)
               VALUES (?, '지출', ?, '정산', ?, ?)`,
              [
                tx.date,
                originalAccount,
                Number(tx.amount),
                `${finalAccount}로 이체 (리밸런싱: ${txId})`
              ]
            );

            // (B) 원 거래의 통장분류를 finalAccount로 변경
            // account_id 갱신을 위해 모델 로직을 쓰는 대신, 여기선 계정 테이블 연동이 필요하므로 업데이트를 TransactionModel로 위임
            // 트랜잭션 내에서 처리하기 위해 동일 커넥션으로 계정 id upsert를 수행
            // accounts 테이블에 없으면 생성
            const [accRows] = await conn.execute('SELECT id FROM accounts WHERE name = ?', [finalAccount]);
            let accountId: number | null = (accRows as any[])[0]?.id ?? null;
            if (!accountId) {
              const [ins] = await conn.execute('INSERT INTO accounts (name) VALUES (?)', [finalAccount]);
              accountId = (ins as any).insertId;
            }

            await conn.execute(
              `UPDATE transactions
               SET account_id = ?, account = ?
               WHERE id = ?`,
              [accountId, finalAccount, txId]
            );

            results.push({ transactionId: txId, decision: d.decision, applied: true });
          } else {
            results.push({ transactionId: txId, decision: d.decision });
          }
        }

        await conn.commit();

        res.json({ ok: true, data: { month: body.month, results } });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('리밸런싱 커밋 오류:', error);
      res.status(500).json({ ok: false, error: '리밸런싱 반영에 실패했습니다.' });
    }
  }
}

