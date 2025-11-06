import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/layout/Header";
import TabNavigation from "./components/layout/TabNavigation";
import type { TabDefinition, TabKey } from "./components/layout/TabNavigation";
import TransactionForm from "./components/transactions/TransactionForm";
import TransactionFilters from "./components/transactions/TransactionFilters";
import TransactionList from "./components/transactions/TransactionList";
import EditTransactionModal from "./components/transactions/EditTransactionModal";
import SummaryPanel from "./components/summary/SummaryPanel";
import BudgetPanel from "./components/budget/BudgetPanel";
import type {
  Transaction,
  TransactionDraft,
  TransactionFilterState,
  TransactionSummary,
  TransactionType,
  BudgetWithUsage,
} from "./types";
import { buildRecentMonths, distinct, monthKey, todayInputValue } from "./utils/formatters";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactionsByMonth,
  updateTransaction,
  fetchAccounts,
  fetchCategories,
} from "./services/transactionService";
import {
  fetchBudgetsByMonth,
  createOrUpdateBudget,
  updateBudget,
  deleteBudget,
} from "./services/budgetService";
import { getAccountColor } from "./utils/iconMappings";

const tabs: TabDefinition[] = [
  { key: "input", label: "내역 입력", description: "새로운 내역을 기록" },
  { key: "history", label: "내역 조회", description: "월별 목록과 필터" },
  { key: "summary", label: "통계 요약", description: "수입·지출 현황" },
  { key: "budget", label: "예산 관리", description: "월별 예산 현황" },
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

  // 특별 집계 계산
  const specialStats: { label: string; amount: number }[] = [];

  // 1. [회사 중식] - '식비' 카테고리 중 '회사'와 '중식' 키워드가 함께 있는 항목
  const lunchExpense = transactions
    .filter((tx) =>
      tx.type === "지출" &&
      tx.category === "식비" &&
      tx.memo &&
      tx.memo.includes("회사") &&
      tx.memo.includes("중식")
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (lunchExpense > 0) {
    specialStats.push({ label: "회사 중식", amount: lunchExpense });
  }

  // 2. [데이트 중 식비] - '데이트' 카테고리 중 '식비' 키워드가 포함된 항목
  const dateFoodExpense = transactions
    .filter((tx) =>
      tx.type === "지출" &&
      tx.category === "데이트" &&
      tx.memo &&
      tx.memo.includes("식비")
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (dateFoodExpense > 0) {
    specialStats.push({ label: "데이트 중 식비", amount: dateFoodExpense });
  }

  return {
    totalIncome: totals.income,
    totalExpense: totals.expense,
    balance: totals.income - totals.expense,
    periodLabel: month,
    categories: sortedCategories,
    accounts: sortedAccounts,
    specialStats: specialStats.length > 0 ? specialStats : undefined,
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
  const [apiAccounts, setApiAccounts] = useState<string[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [isBudgetLoading, setBudgetLoading] = useState(false);

  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 임시: 스켈레톤 UI 테스트를 위한 딜레이 (나중에 제거)
      const [list] = await Promise.all([
        fetchTransactionsByMonth(filters.month),
        new Promise(resolve => setTimeout(resolve, 800))
      ]);
      hasLoadedRef.current = true;
      setTransactions(list);
      setAvailableMonths((prev) => {
        const merged = distinct([...prev, ...list.map((item) => monthKey(item.date))]);
        return merged.sort((a, b) => (a > b ? -1 : 1));
      });
      // Always calculate summary from client-side transactions for accuracy
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

  const loadMasterData = useCallback(async () => {
    const [accounts, categories] = await Promise.all([
      fetchAccounts(),
      fetchCategories(),
    ]);
    setApiAccounts(accounts);
    setApiCategories(categories);
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const fetchBudgets = useCallback(async () => {
    setBudgetLoading(true);
    try {
      const list = await fetchBudgetsByMonth(filters.month);
      setBudgets(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : "예산 데이터를 불러오지 못했어요.";
      setError(message);
    } finally {
      setBudgetLoading(false);
    }
  }, [filters.month]);

  useEffect(() => {
    if (activeTab === "budget") {
      fetchBudgets();
    }
  }, [activeTab, fetchBudgets]);

  const accounts = useMemo(() => {
    const defaultAccounts = [
      "국민은행",
      "토스뱅크",
      "우리은행",
      "신용카드",
      "카카오페이",
      "카카오뱅크",
      "현금",
    ];
    const transactionAccounts = distinct(
      transactions
        .map((tx) => tx.account ?? "")
        .filter((value): value is string => value.length > 0)
    );
    return distinct([...defaultAccounts, ...apiAccounts, ...transactionAccounts]).sort();
  }, [transactions, apiAccounts]);

  const categories = useMemo(() => {
    const defaultCategories = [
      "급여",
      "기타",
      "교통비",
      "구독/포인트",
      "데이트",
      "생활/마트",
      "선물/경조사비",
      "식비",
      "여행/숙박",
      "월세/관리비",
      "저축/상조/보험",
      "카페/음료",
      "통신비/인터넷비",
      "편의점",
      "취미",
      "상납금",
    ];
    const transactionCategories = distinct(
      transactions
        .map((tx) => tx.category ?? "")
        .filter((value): value is string => value.length > 0)
    );
    return distinct([...defaultCategories, ...apiCategories, ...transactionCategories]).sort();
  }, [transactions, apiCategories]);

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

  // 필터링된 거래의 총합 계산
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

  const handleUpdateBudget = async (id: number, targetAmount: number) => {
    try {
      setBudgetLoading(true);
      await updateBudget(id, { target_amount: targetAmount });
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
    if (!confirmed) {
      return;
    }
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

  const handleAddBudget = async (account: string, month: string, targetAmount: number) => {
    try {
      setBudgetLoading(true);
      const color = getAccountColor(account);
      await createOrUpdateBudget({
        account,
        month,
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

  const handleAccountClick = (account: string) => {
    setActiveTab("history");
    setFilters((prev) => ({
      ...prev,
      account: account,
    }));
  };

  const handleExportCSV = () => {
    try {
      // CSV 헤더
      const headers = ["날짜", "구분", "계좌/카드", "카테고리", "금액", "메모"];

      // 데이터를 CSV 행으로 변환
      const rows = transactions.map(tx => [
        tx.date,
        tx.type,
        tx.account ?? "",
        tx.category ?? "",
        tx.amount.toString(),
        (tx.memo ?? "").replace(/"/g, '""') // 큰따옴표 이스케이프
      ]);

      // CSV 문자열 생성
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // BOM 추가 (한글 깨짐 방지)
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

      // 다운로드
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `가계부_${filters.month}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "CSV 내보내기에 실패했어요.";
      setError(message);
    }
  };

  const handleImportCSV = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          return;
        }

        try {
          setLoading(true);
          const text = await file.text();

          // BOM 제거
          const content = text.replace(/^\uFEFF/, "");

          // CSV 파싱
          const lines = content.split("\n").filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error("CSV 파일이 비어있어요.");
          }

          // 헤더 제외하고 데이터 행만 파싱
          const dataLines = lines.slice(1);
          const drafts: TransactionDraft[] = [];

          for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            // CSV 파싱 (큰따옴표로 감싸진 필드 처리)
            const matches = line.match(/("(?:[^"]|"")*"|[^,]*)/g);
            if (!matches || matches.length < 5) {
              continue;
            }

            const cells = matches.map(cell =>
              cell.replace(/^"|"$/g, "").replace(/""/g, '"').trim()
            );

            const [date, type, account, category, amountStr, memo] = cells;

            // 유효성 검사
            if (!date || !type || !amountStr) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 필수 필드 누락`);
              continue;
            }

            if (type !== "수입" && type !== "지출") {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 구분 (${type})`);
              continue;
            }

            const amount = parseFloat(amountStr.replace(/,/g, ""));
            if (isNaN(amount) || amount <= 0) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 금액 (${amountStr})`);
              continue;
            }

            drafts.push({
              date,
              type: type as TransactionType,
              account: account || "",
              category: category || "",
              amount,
              memo: memo || "",
            });
          }

          if (drafts.length === 0) {
            throw new Error("가져올 수 있는 데이터가 없어요.");
          }

          // 서버에 저장
          for (const draft of drafts) {
            await createTransaction(normalizeDraft(draft));
          }

          // 데이터 새로고침
          await refetch();

          alert(`${drafts.length}개의 내역을 가져왔어요.`);
          setActiveTab("history");
        } catch (err) {
          const message = err instanceof Error ? err.message : "CSV 가져오기에 실패했어요.";
          setError(message);
        } finally {
          setLoading(false);
        }
      };

      input.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "파일을 선택하지 못했어요.";
      setError(message);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-container">
        <Header
          onClickTitle={() => setActiveTab("input")}
          onExportCSV={handleExportCSV}
          onImportCSV={handleImportCSV}
        />
        <TabNavigation tabs={tabs} activeTab={activeTab} onSelect={handleTabChange} />

        <section className={activeTab === "input" ? "tab-panel tab-panel--active tab-panel--input" : "tab-panel"}>
          {activeTab === "input" ? (
            <>
              {error && <div className="alert alert--error">{error}</div>}
              <TransactionForm
                accounts={accounts}
                categories={categories}
                onSubmit={handleCreate}
                submitting={isSubmitting && !isEditModalOpen}
                submitLabel="내역 저장"
              />
            </>
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
                totalIncome={filteredSummary.totalIncome}
                totalExpense={filteredSummary.totalExpense}
                balance={filteredSummary.balance}
              />
            </div>
          ) : null}
        </section>

        <section className={activeTab === "summary" ? "tab-panel tab-panel--active tab-panel--summary" : "tab-panel"}>
          {activeTab === "summary" ? (
            <SummaryPanel
              summary={summary}
              loading={isLoading}
              currentMonth={filters.month}
              availableMonths={availableMonths}
              onMonthChange={(month) => setFilters((prev) => ({ ...prev, month }))}
            />
          ) : null}
        </section>

        <section className={activeTab === "budget" ? "tab-panel tab-panel--active tab-panel--budget" : "tab-panel"}>
          {activeTab === "budget" ? (
            <BudgetPanel
              budgets={budgets}
              loading={isBudgetLoading}
              currentMonth={filters.month}
              availableMonths={availableMonths}
              accounts={accounts}
              onMonthChange={(month) => setFilters((prev) => ({ ...prev, month }))}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={handleDeleteBudget}
              onAddBudget={handleAddBudget}
              onCategoryUpdate={loadMasterData}
              onAccountClick={handleAccountClick}
            />
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
