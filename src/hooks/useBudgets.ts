import { useCallback, useEffect, useState } from "react";
import type { BudgetWithUsage } from "../types";
import {
  fetchBudgetsByMonth,
  createOrUpdateBudget,
  updateBudget,
  deleteBudget,
  updateBudgetSortOrder,
} from "../services/budgetService";
import { getAccountColor } from "../utils/iconMappings";
import type { TabKey } from "../components/layout/TabNavigation";

export function useBudgets(
  activeTab: TabKey,
  month: string,
  setError: (error: string | null) => void
) {
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [isBudgetLoading, setBudgetLoading] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setBudgetLoading(true);
    try {
      const list = await fetchBudgetsByMonth(month);
      setBudgets(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : "예산 데이터를 불러오지 못했어요.";
      setError(message);
    } finally {
      setBudgetLoading(false);
    }
  }, [month, setError]);

  useEffect(() => {
    if (activeTab === "budget") {
      fetchBudgets();
    }
  }, [activeTab, fetchBudgets]);

  const handleUpdateBudget = async (id: number, targetAmount: number, account?: string) => {
    try {
      setBudgetLoading(true);
      if (id === 0 && account) {
        const color = getAccountColor(account);
        await createOrUpdateBudget({
          account,
          month,
          target_amount: targetAmount,
          color,
        });
      } else {
        await updateBudget(id, { target_amount: targetAmount });
      }
      await fetchBudgets();
    } catch (err) {
      const message = err instanceof Error ? err.message : "예산을 수정하지 못했어요.";
      setError(message);
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    const confirmed = window.confirm("이 예산을 삭제할까요?");
    if (!confirmed) return;
    try {
      setBudgetLoading(true);
      await deleteBudget(id);
      await fetchBudgets();
    } catch (err) {
      const message = err instanceof Error ? err.message : "예산을 삭제하지 못했어요.";
      setError(message);
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleAddBudget = async (account: string, budgetMonth: string, targetAmount: number) => {
    try {
      setBudgetLoading(true);
      const color = getAccountColor(account);
      await createOrUpdateBudget({
        account,
        month: budgetMonth,
        target_amount: targetAmount,
        color,
      });
      await fetchBudgets();
    } catch (err) {
      const message = err instanceof Error ? err.message : "예산을 추가하지 못했어요.";
      setError(message);
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleReorderBudgets = async (orderedAccounts: string[]) => {
    if (!month) return;

    // Optimistic update
    const newBudgets: BudgetWithUsage[] = [];
    orderedAccounts.forEach((account, index) => {
      const budget = budgets.find(b => b.account === account);
      if (budget) {
        newBudgets.push({ ...budget, sort_order: index + 1 });
      }
    });
    setBudgets(newBudgets);

    try {
      await updateBudgetSortOrder(month, orderedAccounts);
      fetchBudgets();
    } catch (err) {
      await fetchBudgets();
      const message = err instanceof Error ? err.message : "예산 순서를 변경하지 못했어요.";
      setError(message);
    }
  };

  return {
    budgets,
    isBudgetLoading,
    handleUpdateBudget,
    handleDeleteBudget,
    handleAddBudget,
    handleReorderBudgets,
  };
}
