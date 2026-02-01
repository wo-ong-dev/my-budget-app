import httpClient from "./httpClient";
import type { BudgetWithUsage, BudgetDraft } from "../types";

export async function fetchBudgetsByMonth(month: string): Promise<BudgetWithUsage[]> {
  const response = await httpClient.get<{ ok: boolean; budgets: BudgetWithUsage[] }>(
    `/budgets?month=${month}`
  );
  return response.data.budgets;
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
