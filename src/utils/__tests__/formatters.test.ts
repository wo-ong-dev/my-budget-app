import { describe, it, expect } from 'vitest';
import {
  todayInputValue,
  toInputDateValue,
  formatCurrency,
  formatCurrencyInput,
  parseCurrencyInput,
  monthKey,
  monthLabel,
  distinct,
  buildRecentMonths,
  getMonthRange,
} from '../formatters';

describe('todayInputValue', () => {
  it('YYYY-MM-DD 형식이다', () => {
    const result = todayInputValue();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('toInputDateValue', () => {
  it('이미 YYYY-MM-DD면 그대로', () => {
    expect(toInputDateValue('2025-01-15')).toBe('2025-01-15');
  });

  it('ISO 8601 형식을 변환', () => {
    const result = toInputDateValue('2025-11-04T00:00:00.000Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('빈 문자열이면 오늘 날짜', () => {
    const result = toInputDateValue('');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('잘못된 형식이면 오늘 날짜', () => {
    const result = toInputDateValue('invalid-date');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatCurrency', () => {
  it('천 단위 콤마 포맷', () => {
    expect(formatCurrency(1234567)).toBe('1,234,567');
  });

  it('0은 "0"', () => {
    expect(formatCurrency(0)).toBe('0');
  });

  it('소수점은 반올림', () => {
    expect(formatCurrency(1234.6)).toBe('1,235');
  });

  it('NaN이면 "0"', () => {
    expect(formatCurrency(NaN)).toBe('0');
  });

  it('Infinity면 "0"', () => {
    expect(formatCurrency(Infinity)).toBe('0');
  });
});

describe('formatCurrencyInput', () => {
  it('0이면 빈 문자열', () => {
    expect(formatCurrencyInput(0)).toBe('');
  });

  it('음수도 절대값으로', () => {
    expect(formatCurrencyInput(-12500)).toBe('12,500');
  });

  it('NaN이면 빈 문자열', () => {
    expect(formatCurrencyInput(NaN)).toBe('');
  });
});

describe('parseCurrencyInput', () => {
  it('콤마 포함 문자열 파싱', () => {
    expect(parseCurrencyInput('1,234,567')).toBe(1234567);
  });

  it('빈 문자열이면 0', () => {
    expect(parseCurrencyInput('')).toBe(0);
  });

  it('숫자가 아닌 문자 제거', () => {
    expect(parseCurrencyInput('₩12,500원')).toBe(12500);
  });
});

describe('monthKey', () => {
  it('Date 문자열에서 YYYY-MM 추출', () => {
    expect(monthKey('2025-01-15')).toBe('2025-01');
  });

  it('Date 객체도 동작', () => {
    expect(monthKey(new Date(2025, 0, 15))).toBe('2025-01');
  });

  it('잘못된 문자열이면 현재 월', () => {
    const result = monthKey('invalid');
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('monthLabel', () => {
  it('한글 형식으로 변환', () => {
    expect(monthLabel('2025-01')).toBe('2025년 1월');
    expect(monthLabel('2025-12')).toBe('2025년 12월');
  });
});

describe('distinct', () => {
  it('중복 제거', () => {
    expect(distinct(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('falsy 값 제거', () => {
    expect(distinct(['a', '', 'b', null as unknown as string])).toEqual(['a', 'b']);
  });
});

describe('getMonthRange', () => {
  it('월의 시작일과 마지막일', () => {
    const range = getMonthRange('2025-01');
    expect(range.from).toBe('2025-01-01');
    expect(range.to).toBe('2025-01-31');
  });

  it('2월 (평년)', () => {
    const range = getMonthRange('2025-02');
    expect(range.to).toBe('2025-02-28');
  });

  it('2월 (윤년)', () => {
    const range = getMonthRange('2024-02');
    expect(range.to).toBe('2024-02-29');
  });
});

describe('buildRecentMonths', () => {
  it('기본 12개 월 생성', () => {
    const months = buildRecentMonths();
    expect(months).toHaveLength(12);
    // 최신 월이 첫 번째
    months.forEach(m => expect(m).toMatch(/^\d{4}-\d{2}$/));
  });

  it('지정 개수만큼 생성', () => {
    expect(buildRecentMonths(3)).toHaveLength(3);
  });
});
