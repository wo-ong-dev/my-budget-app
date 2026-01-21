import pool from '../config/database';
import { Transaction } from '../models/Transaction';

export type RebalanceDecision = 'APPLY' | 'DEFER' | 'WRONG';
export type RebalanceLearningScope = 'NONE' | 'PATTERN' | 'CATEGORY';

export interface RebalanceSuggestionItem {
  transaction_id: number;
  date: string;
  type: '수입' | '지출';
  amount: number;
  category: string | null;
  memo: string | null;
  original_account: string | null;
  suggested_account: string | null;
  pattern_key: string | null;
  reason: string;
}

const DEFAULT_CATEGORY_ACCOUNT_MAP: Record<string, string> = {
  식비: '토스뱅크',
  '카페/음료': '토스뱅크',
  '생활/마트': '토스뱅크',
  교통비: '토스뱅크',
  '구독/포인트': '토스뱅크',

  '월세/관리비': '국민은행',
  '통신비/인터넷비': '국민은행',
  '저축/상조/보험': '국민은행',
  상납금: '국민은행'
};

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * 메모에서 학습 키(pattern_key) 추출
 * - "홍콩여행_기념품" -> "홍콩여행"
 * - "버거킹 회사 중식" -> "버거킹"
 */
export function extractPatternKey(memo: string | null | undefined): string | null {
  if (!memo) return null;
  const text = normalizeText(memo);
  const underscoreIdx = text.indexOf('_');
  if (underscoreIdx > 0) {
    return text.slice(0, underscoreIdx).trim().slice(0, 100);
  }
  const firstToken = text.split(' ')[0]?.trim();
  if (!firstToken) return null;
  return firstToken.slice(0, 100);
}

async function getOverrideExpectedAccount(category: string | null, patternKey: string | null): Promise<string | null> {
  if (!category || !patternKey) return null;
  const [rows] = await pool.execute(
    `SELECT expected_account
     FROM rebalance_overrides
     WHERE category = ? AND pattern_key = ?
     ORDER BY confidence DESC, updated_at DESC
     LIMIT 1`,
    [category, patternKey]
  );
  const row = (rows as any[])[0];
  return row?.expected_account ?? null;
}

export async function computeSuggestedAccount(tx: Transaction): Promise<{ suggested: string | null; reason: string; patternKey: string | null }> {
  const category = tx.category ?? null;
  const patternKey = extractPatternKey(tx.memo ?? null);

  const override =
    (patternKey ? await getOverrideExpectedAccount(category, patternKey) : null) ??
    (await getOverrideExpectedAccount(category, '*'));
  if (override) {
    return {
      suggested: override,
      reason: `학습 규칙 적용 (${category}${patternKey ? ` + ${patternKey}` : ""})`,
      patternKey
    };
  }

  if (category && DEFAULT_CATEGORY_ACCOUNT_MAP[category]) {
    return {
      suggested: DEFAULT_CATEGORY_ACCOUNT_MAP[category],
      reason: `기본 매핑 적용 (${category})`,
      patternKey
    };
  }

  return {
    suggested: null,
    reason: '추천 규칙이 없어 보류',
    patternKey
  };
}

export async function upsertOverride(category: string, patternKey: string, expectedAccount: string): Promise<void> {
  await pool.execute(
    `INSERT INTO rebalance_overrides (category, pattern_key, expected_account, confidence)
     VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       expected_account = VALUES(expected_account),
       confidence = confidence + 1,
       updated_at = CURRENT_TIMESTAMP`,
    [category, patternKey, expectedAccount]
  );
}

export function normalizeOverridePatternKey(scope: RebalanceLearningScope, patternKey: string | null): string | null {
  if (scope === 'NONE') return null;
  if (scope === 'CATEGORY') return '*';
  // PATTERN
  return patternKey;
}

export async function insertFeedback(params: {
  month: string;
  transactionId: number;
  originalAccount: string | null;
  category: string | null;
  memo: string | null;
  suggestedAccount: string | null;
  decision: RebalanceDecision;
  correctedAccount: string | null;
}): Promise<void> {
  await pool.execute(
    `INSERT INTO rebalance_feedback
      (month, transaction_id, original_account, category, memo, suggested_account, decision, corrected_account)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.month,
      params.transactionId,
      params.originalAccount,
      params.category,
      params.memo,
      params.suggestedAccount,
      params.decision,
      params.correctedAccount
    ]
  );
}

