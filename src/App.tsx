import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/layout/Header";
import TabNavigation from "./components/layout/TabNavigation";
import type { TabDefinition, TabKey } from "./components/layout/TabNavigation";
import TransactionForm from "./components/transactions/TransactionForm";
import TransactionFilters from "./components/transactions/TransactionFilters";
import TransactionList from "./components/transactions/TransactionList";
import EditTransactionModal from "./components/transactions/EditTransactionModal";
import SummaryPanel from "./components/summary/SummaryPanel";
import type {
  Transaction,
  TransactionDraft,
  TransactionFilterState,
  TransactionSummary,
} from "./types";
import { buildRecentMonths, distinct, monthKey, todayInputValue } from "./utils/formatters";
import {
  createTransaction,
  deleteTransaction,
  fetchSummary,
  fetchTransactionsByMonth,
  updateTransaction,
} from "./services/transactionService";

const tabs: TabDefinition[] = [
  { key: "input", label: "내역 입력", description: "새로운 내역을 기록" },
  { key: "history", label: "내역 조회", description: "월별 목록과 필터" },
  { key: "summary", label: "통계 요약", description: "수입·지출 현황" },
];

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

function calculateSummary(transactions: Transaction[], month?: string): TransactionSummary {
  const totals = transactions.reduce(
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

  const categoriesMap = new Map<string, { category: string; income: number; expense: number }>();
  const accountsMap = new Map<string, { account: string; income: number; expense: number }>();

  transactions.forEach((tx) => {
    const categoryKey = tx.category ?? "기타";
    const accountKey = tx.account ?? "미입력";

    const categoryEntry = categoriesMap.get(categoryKey) ?? { category: categoryKey, income: 0, expense: 0 };
    const accountEntry = accountsMap.get(accountKey) ?? { account: accountKey, income: 0, expense: 0 };

    if (tx.type === "수입") {
      categoryEntry.income += tx.amount;
      accountEntry.income += tx.amount;
    } else {
      categoryEntry.expense += tx.amount;
      accountEntry.expense += tx.amount;
    }

    categoriesMap.set(categoryKey, categoryEntry);
    accountsMap.set(accountKey, accountEntry);
  });

  const sortedCategories = Array.from(categoriesMap.values()).sort((a, b) => b.expense - a.expense);
  const sortedAccounts = Array.from(accountsMap.values()).sort((a, b) => b.expense - a.expense);

  return {
    totalIncome: totals.income,
    totalExpense: totals.expense,
    balance: totals.income - totals.expense,
    periodLabel: month,
    categories: sortedCategories,
    accounts: sortedAccounts,
  };
}

function normalizeDraft(draft: TransactionDraft): TransactionDraft {
  return {
    ...draft,
    amount: Math.abs(Math.round(draft.amount)),
  };
}

function App() {
  const initialMonths = useMemo(() => buildRecentMonths(12), []);
  const [availableMonths, setAvailableMonths] = useState<string[]>(initialMonths);
  const [activeTab, setActiveTab] = useState<TabKey>("input");
  const [filters, setFilters] = useState<TransactionFilterState>(() => ({
    month: initialMonths[0],
    type: "ALL",
    account: "ALL",
    category: "ALL",
    keyword: "",
  }));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isDeleting, setDeleting] = useState(false);

  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTransactionsByMonth(filters.month);
      hasLoadedRef.current = true;
      setTransactions(list);
      setAvailableMonths((prev) => {
        const merged = distinct([...prev, ...list.map((item) => monthKey(item.date))]);
        return merged.sort((a, b) => (a > b ? -1 : 1));
      });
      const remoteSummary = await fetchSummary(filters.month);
      setSummary(remoteSummary ?? calculateSummary(list, filters.month));
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

  const accounts = useMemo(() => {
    const defaultAccounts = ["카카오 체크카드", "우리은행 월급통장", "신한카드", "현금"];
    const transactionAccounts = distinct(
      transactions
        .map((tx) => tx.account ?? "")
        .filter((value): value is string => value.length > 0)
    );
    return distinct([...defaultAccounts, ...transactionAccounts]).sort();
  }, [transactions]);

  const categories = useMemo(() => {
    const defaultCategories = ["식비", "교통비", "쇼핑", "의료비", "문화생활", "급여", "용돈", "기타"];
    const transactionCategories = distinct(
      transactions
        .map((tx) => tx.category ?? "")
        .filter((value): value is string => value.length > 0)
    );
    return distinct([...defaultCategories, ...transactionCategories]).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (filters.type !== "ALL" && tx.type !== filters.type) {
          return false;
        }
        if (filters.account !== "ALL" && tx.account !== filters.account) {
          return false;
        }
        if (filters.category !== "ALL" && tx.category !== filters.category) {
          return false;
        }
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

  const handleCreate = async (draft: TransactionDraft) => {
    try {
      setSubmitting(true);
      await createTransaction(normalizeDraft(draft));
      await refetch();
      setActiveTab("history");
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
    if (!editingTransaction) {
      return;
    }
    try {
      setSubmitting(true);
      await updateTransaction(editingTransaction.id, normalizeDraft(draft));
      setEditModalOpen(false);
      setEditingTransaction(null);
      await refetch();
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
    if (!confirmed) {
      return;
    }
    try {
      setDeleting(true);
      await deleteTransaction(transaction.id);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "내역을 삭제하지 못했어요.";
      setError(message);
    } finally {
      setDeleting(false);
      setEditModalOpen(false);
      setEditingTransaction(null);
    }
  };

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
  };

  const handleFiltersChange = (next: TransactionFilterState) => {
    setFilters(next);
  };

  return (
    <div className="app-shell">
      <div className="app-container">
        <Header onClickTitle={() => setActiveTab("input")} />
        <TabNavigation tabs={tabs} activeTab={activeTab} onSelect={handleTabChange} />

        <section className={activeTab === "input" ? "tab-panel tab-panel--active tab-panel--input" : "tab-panel"}>
          {activeTab === "input" ? (
            <div className="history-container">
              {error && <div className="alert alert--error">{error}</div>}
              <TransactionForm
                accounts={accounts}
                categories={categories}
                onSubmit={handleCreate}
                submitting={isSubmitting && !isEditModalOpen}
                submitLabel="내역 저장"
              />
            </div>
          ) : null}
        </section>

        <section className={activeTab === "history" ? "tab-panel tab-panel--active tab-panel--history" : "tab-panel"}>
          {activeTab === "history" ? (
            <div className="history-container">
              {error && <div className="alert alert--error">{error}</div>}
              <TransactionFilters
                filters={filters}
                onChange={handleFiltersChange}
                months={availableMonths}
                accounts={accounts}
                categories={categories}
              />
              <TransactionList
                transactions={filteredTransactions}
                isLoading={isLoading}
                onEdit={handleEditRequest}
                onDelete={handleDelete}
              />
            </div>
          ) : null}
        </section>

        <section className={activeTab === "summary" ? "tab-panel tab-panel--active tab-panel--summary" : "tab-panel"}>
          {activeTab === "summary" ? (
            <div className="history-container">
              <SummaryPanel summary={summary} loading={isLoading} onRefresh={refetch} />
            </div>
          ) : null}
        </section>
      </div>

      <EditTransactionModal
        open={isEditModalOpen}
        transaction={editingTransaction}
        accounts={accounts}
        categories={categories}
        onSubmit={handleUpdate}
        onDelete={() => {
          if (editingTransaction) {
            void handleDelete(editingTransaction);
          }
        }}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTransaction(null);
        }}
        submitting={isSubmitting}
        deleting={isDeleting}
      />
    </div>
  );
}

export default App;
