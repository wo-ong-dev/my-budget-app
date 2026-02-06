import { describe, it, expect } from 'vitest';
import { calculateSummary, normalizeDraft } from '../calculateSummary';
import type { Transaction } from '../../types';

const makeTx = (overrides: Partial<Transaction> & Pick<Transaction, 'type' | 'amount'>): Transaction => ({
  id: 1,
  date: '2025-01-15',
  account: '토스뱅크',
  category: '식비',
  memo: null,
  ...overrides,
});

describe('calculateSummary', () => {
  it('빈 배열이면 모두 0', () => {
    const result = calculateSummary([]);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpense).toBe(0);
    expect(result.balance).toBe(0);
    expect(result.categories).toEqual([]);
    expect(result.accounts).toEqual([]);
  });

  it('수입/지출 합산이 정확하다', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '수입', amount: 3000000, category: '급여' }),
      makeTx({ id: 2, type: '지출', amount: 12500, category: '식비' }),
      makeTx({ id: 3, type: '지출', amount: 45000, category: '여가' }),
    ];
    const result = calculateSummary(txs, '2025-01');
    expect(result.totalIncome).toBe(3000000);
    expect(result.totalExpense).toBe(57500);
    expect(result.balance).toBe(3000000 - 57500);
    expect(result.periodLabel).toBe('2025-01');
  });

  it('카테고리별 집계가 정확하다', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '지출', amount: 10000, category: '식비' }),
      makeTx({ id: 2, type: '지출', amount: 20000, category: '식비' }),
      makeTx({ id: 3, type: '지출', amount: 5000, category: '교통비' }),
    ];
    const result = calculateSummary(txs);
    const food = result.categories!.find(c => c.category === '식비');
    const transport = result.categories!.find(c => c.category === '교통비');
    expect(food?.expense).toBe(30000);
    expect(transport?.expense).toBe(5000);
    // 지출이 큰 순서로 정렬
    expect(result.categories![0].category).toBe('식비');
  });

  it('계좌별 집계가 정확하다', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '지출', amount: 10000, account: '토스뱅크' }),
      makeTx({ id: 2, type: '수입', amount: 50000, account: '국민은행' }),
    ];
    const result = calculateSummary(txs);
    const toss = result.accounts!.find(a => a.account === '토스뱅크');
    const kb = result.accounts!.find(a => a.account === '국민은행');
    expect(toss?.expense).toBe(10000);
    expect(kb?.income).toBe(50000);
  });

  it('회사 중식 특별 집계', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '지출', amount: 8000, category: '식비', memo: '회사 중식 김치찌개' }),
      makeTx({ id: 2, type: '지출', amount: 9000, category: '식비', memo: '회사 중식 된장찌개' }),
      makeTx({ id: 3, type: '지출', amount: 15000, category: '식비', memo: '외식' }),
    ];
    const result = calculateSummary(txs);
    expect(result.specialStats).toBeDefined();
    const lunch = result.specialStats?.find(s => s.label === '회사 중식');
    expect(lunch?.amount).toBe(17000);
  });

  it('데이트 중 식비 특별 집계', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '지출', amount: 30000, category: '데이트', memo: '식비 - 이탈리안' }),
      makeTx({ id: 2, type: '지출', amount: 20000, category: '데이트', memo: '영화' }),
    ];
    const result = calculateSummary(txs);
    const dateFood = result.specialStats?.find(s => s.label === '데이트 중 식비');
    expect(dateFood?.amount).toBe(30000);
  });

  it('특별 집계가 없으면 undefined', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '지출', amount: 10000, category: '교통비', memo: '택시' }),
    ];
    const result = calculateSummary(txs);
    expect(result.specialStats).toBeUndefined();
  });

  it('null 카테고리/계좌는 기타/미입력으로 처리', () => {
    const txs: Transaction[] = [
      makeTx({ id: 1, type: '지출', amount: 5000, category: null, account: null }),
    ];
    const result = calculateSummary(txs);
    expect(result.categories![0].category).toBe('기타');
    expect(result.accounts![0].account).toBe('미입력');
  });
});

describe('normalizeDraft', () => {
  it('금액을 절대값 정수로 정규화', () => {
    const draft = { date: '2025-01-01', type: '지출' as const, account: '', category: '', amount: -12500.7, memo: '' };
    const result = normalizeDraft(draft);
    expect(result.amount).toBe(12501);
  });

  it('이미 양수면 반올림만', () => {
    const draft = { date: '2025-01-01', type: '수입' as const, account: '', category: '', amount: 3000000, memo: '' };
    const result = normalizeDraft(draft);
    expect(result.amount).toBe(3000000);
  });
});
