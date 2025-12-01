import type { ExpensePlanDraft } from "../types/expensePlan";

// 2025-11 월간 지출 계획을 템플릿으로 사용
// month 값만 현재 선택된 달로 바꿔서 사용한다.

const TEMPLATE_PLANS: Omit<ExpensePlanDraft, "month">[] = [
  // 국민은행 (2025-11 현재 DB 상태 기준)
  { account: "국민은행", name: "무제 회비", amount: 50_000, due_day: 1 },
  { account: "국민은행", name: "보컬레슨", amount: 150_000, due_day: 1 },
  { account: "국민은행", name: "상납금", amount: 300_000, due_day: 1 },
  { account: "국민은행", name: "수도/전기", amount: 50_000, due_day: 1 },
  { account: "국민은행", name: "여행계", amount: 10_000, due_day: 1 },
  { account: "국민은행", name: "대출이자", amount: 185_000, due_day: 10 },
  { account: "국민은행", name: "보험", amount: 140_000, due_day: 10 },
  { account: "국민은행", name: "상조", amount: 40_000, due_day: 10 },
  { account: "국민은행", name: "운전자보험", amount: 10_000, due_day: 10 },
  { account: "국민은행", name: "청년적금", amount: 700_000, due_day: 10 },
  { account: "국민은행", name: "쿠팡와우", amount: 8_000, due_day: 21 },
  { account: "국민은행", name: "인터넷", amount: 20_000, due_day: 25 },
  { account: "국민은행", name: "월세", amount: 200_000, due_day: 28 },
  { account: "국민은행", name: "주택청약", amount: 250_000, due_day: 30 },

  // 신용카드
  { account: "신용카드", name: "휴대폰", amount: 90_000, due_day: 10 },
  { account: "신용카드", name: "가스비", amount: 100_000, due_day: 26 },
  { account: "신용카드", name: "교통비", amount: 70_000, due_day: 31 },

  // 토스뱅크
  { account: "토스뱅크", name: "미용", amount: 50_000, due_day: 1 },
  { account: "토스뱅크", name: "생활비", amount: 400_000, due_day: 1 },

  // 카카오페이
  { account: "카카오페이", name: "넷플릭스", amount: 7_000, due_day: 1 },

  // 카카오뱅크
  { account: "카카오뱅크", name: "비상금2", amount: 0, due_day: 1 },

  // 우리은행
  { account: "우리은행", name: "데이트", amount: 600_000, due_day: 1 },
];

export function getDefaultExpensePlans(month: string): ExpensePlanDraft[] {
  return TEMPLATE_PLANS.map((plan) => ({
    ...plan,
    month,
  }));
}


