import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Transaction,
  TransactionDraft,
  TransactionFilterState,
  TransactionSummary,
  MonthlyComparison,
} from "../types";
import { buildRecentMonths, distinct, monthKey, todayInputValue } from "../utils/formatters";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactionsByMonth,
  updateTransaction,
} from "../services/transactionService";
import { calculateSummary, calculateMonthlyComparison, normalizeDraft } from "../utils/calculateSummary";
import type { TabKey } from "../components/layout/TabNavigation";

const fallbackTransactions: Transaction[] = [
  {
    id: 1,
    date: todayInputValue(),
    type: "지출",
    account: "카카오 체크카드",
    category: "식비",
    amount: 12500,
    memo: "회사 점심",
  },
  {
    id: 2,
    date: todayInputValue(),
    type: "수입",
    account: "우리은행 월급통장",
    category: "급여",
    amount: 3200000,
    memo: "9월 급여",
  },
  {
    id: 3,
    date: "2025-08-28",
    type: "지출",
    account: "토스 카드",
    category: "여가",
    amount: 45000,
    memo: "주말 영화",
  },
];

export function useTransactions(activeTab: TabKey) {
  const initialMonths = useMemo(() => buildRecentMonths(12), []);
  const [availableMonths, setAvailableMonths] = useState<string[]>(initialMonths);
  const [filters, setFilters] = useState<TransactionFilterState>(() => ({
    month: initialMonths[0],
    type: "ALL",
    account: "ALL",
    category: "ALL",
    keyword: "",
  }));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparison | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const list = await fetchTransactionsByMonth(filters.month);
      hasLoadedRef.current = true;
      setTransactions(list);
      setAvailableMonths((prev) => {
        const merged = distinct([...prev, ...list.map((item) => monthKey(item.date))]);
        return merged.sort((a, b) => (a > b ? -1 : 1));
      });
      const calculatedSummary = calculateSummary(list, filters.month);
      setSummary(calculatedSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : "데이터를 불러오지 못했어요.";
      setError(message);
      if (!hasLoadedRef.current) {
        setTransactions(fallbackTransactions);
        setSummary(calculateSummary(fallbackTransactions, filters.month));
      }
    } finally {
      setLoading(false);
    }
  }, [filters.month]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!availableMonths.includes(filters.month) && availableMonths.length > 0) {
      setFilters((prev) => ({ ...prev, month: availableMonths[0] }));
    }
  }, [availableMonths, filters.month]);

  // 월별 비교 데이터 가져오기
  const fetchMonthlyComparisonData = useCallback(async () => {
    if (activeTab !== "summary") return;
    try {
      const comparison = await calculateMonthlyComparison(
        filters.month,
        fetchTransactionsByMonth
      );
      setMonthlyComparison(comparison);
    } catch (err) {
      console.error('월별 비교 데이터 조회 실패:', err);
      setMonthlyComparison(null);
    }
  }, [filters.month, activeTab]);

  useEffect(() => {
    if (activeTab === "summary") {
      fetchMonthlyComparisonData();
    }
  }, [activeTab, fetchMonthlyComparisonData]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (filters.type !== "ALL" && tx.type !== filters.type) return false;
        if (filters.account !== "ALL" && tx.account !== filters.account) return false;
        if (filters.category !== "ALL" && tx.category !== filters.category) return false;
        if (filters.keyword.trim()) {
          const keyword = filters.keyword.trim();
          return (
            (tx.memo && tx.memo.includes(keyword)) ||
            (tx.category && tx.category.includes(keyword)) ||
            (tx.account && tx.account.includes(keyword))
          );
        }
        return true;
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [transactions, filters]);

  const filteredSummary = useMemo(() => {
    const totals = filteredTransactions.reduce(
      (acc, tx) => {
        if (tx.type === "수입") {
          acc.income += tx.amount;
        } else {
          acc.expense += tx.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
    return {
      totalIncome: totals.income,
      totalExpense: totals.expense,
      balance: totals.income - totals.expense,
    };
  }, [filteredTransactions]);

  const handleCreate = async (draft: TransactionDraft, quickInputMode: boolean, setActiveTab: (tab: TabKey) => void) => {
    try {
      setSubmitting(true);
      await createTransaction(normalizeDraft(draft));
      await refetch();
      if (!quickInputMode) {
        setActiveTab("history");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "내역을 저장하지 못했어요.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRequest = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleUpdate = async (draft: TransactionDraft) => {
    if (!editingTransaction) return;
    try {
      setSubmitting(true);
      await updateTransaction(editingTransaction.id, normalizeDraft(draft));
      await refetch();
      setEditModalOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "내역을 수정하지 못했어요.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    const target = transaction.category ?? "이 내역";
    const confirmed = window.confirm(`${target}을 삭제할까요?`);
    if (!confirmed) return;
    try {
      setDeleting(true);
      await deleteTransaction(transaction.id);
      await refetch();
      setEditModalOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "내역을 삭제하지 못했어요.";
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  return {
    availableMonths,
    filters,
    setFilters,
    transactions,
    summary,
    monthlyComparison,
    isLoading,
    error,
    setError,
    setLoading,
    editingTransaction,
    isEditModalOpen,
    setEditModalOpen,
    setEditingTransaction,
    isSubmitting,
    isDeleting,
    filteredTransactions,
    filteredSummary,
    refetch,
    handleCreate,
    handleEditRequest,
    handleUpdate,
    handleDelete,
  };
}
