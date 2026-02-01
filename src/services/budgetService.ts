import httpClient from "./httpClient";
import type { BudgetWithUsage, BudgetDraft } from "../types";

export async function fetchBudgetsByMonth(month: string): Promise<BudgetWithUsage[]> {
  const response = await httpClient.get<{ ok: boolean; budgets: BudgetWithUsage[] }>(
    `/budgets?month=${month}`
  );
  return response.data.budgets;
}

/**
 * 직전 달의 예산을 현재 달로 복사합니다.
 * @param currentMonth 현재 월 (YYYY-MM 형식)
 * @returns 복사된 예산 목록
 */
export async function copyBudgetsFromPreviousMonth(currentMonth: string): Promise<BudgetWithUsage[]> {
  // 직전 달 계산
  const [year, month] = currentMonth.split('-').map(Number);
  let prevMonth = month - 1;
  let prevYear = year;

  if (prevMonth <= 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const previousMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // 직전 달 예산 조회
  const previousBudgets = await fetchBudgetsByMonth(previousMonth);

  if (previousBudgets.length === 0) {
    return [];
  }

  // 직전 달 예산을 현재 달로 복사
  const copiedBudgets: BudgetWithUsage[] = [];

  for (const budget of previousBudgets) {
    const newBudget = await createOrUpdateBudget({
      account: budget.account,
      month: currentMonth,
      target_amount: budget.target_amount,
      color: budget.color,
    });
    copiedBudgets.push(newBudget);
  }

  return copiedBudgets;
}

export async function createOrUpdateBudget(budget: BudgetDraft): Promise<BudgetWithUsage> {
  const response = await httpClient.post<{ ok: boolean; data: BudgetWithUsage }>("/budgets", budget);
  return response.data.data;
}

export async function updateBudget(id: number, budget: Partial<BudgetDraft>): Promise<BudgetWithUsage> {
  const response = await httpClient.put<{ ok: boolean; data: BudgetWithUsage }>(`/budgets/${id}`, budget);
  return response.data.data;
}

export async function deleteBudget(id: number): Promise<void> {
  await httpClient.delete(`/budgets/${id}`);
}
