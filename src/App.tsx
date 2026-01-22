import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSwipe } from "./hooks/useSwipe";
import LoginScreen from "./components/auth/LoginScreen";
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
  MonthlyComparison,
} from "./types";
import { buildRecentMonths, distinct, monthKey, todayInputValue } from "./utils/formatters";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactionsByMonth,
  fetchTransactionsByDateRange,
  updateTransaction,
  fetchAccounts,
  fetchCategoriesWithId,
  type CategoryItem,
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

// 월별 비교 데이터 계산 함수
async function calculateMonthlyComparison(
  currentMonth: string,
  fetchTransactionsFn: (month: string) => Promise<Transaction[]>
): Promise<MonthlyComparison | null> {
  try {
    // 현재 월 데이터
    const currentTransactions = await fetchTransactionsFn(currentMonth);
    const currentSummary = calculateSummary(currentTransactions, currentMonth);

    // 이전 3개월 계산
    const [year, month] = currentMonth.split('-').map(Number);
    const previousMonths: string[] = [];

    for (let i = 1; i <= 3; i++) {
      let prevMonth = month - i;
      let prevYear = year;

      if (prevMonth <= 0) {
        prevMonth += 12;
        prevYear -= 1;
      }

      previousMonths.push(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
    }

    // 이전 3개월 데이터 가져오기
    const previousMonthsData = await Promise.all(
      previousMonths.map(async (m) => {
        const transactions = await fetchTransactionsFn(m);
        const summary = calculateSummary(transactions, m);
        return {
          month: m,
          income: summary.totalIncome,
          expense: summary.totalExpense,
          balance: summary.balance,
        };
      })
    );

    // 전월 데이터
    const previousMonth = previousMonthsData[0];

    // 3개월 평균 계산
    const threeMonthAverage = {
      income: previousMonthsData.reduce((sum, data) => sum + data.income, 0) / 3,
      expense: previousMonthsData.reduce((sum, data) => sum + data.expense, 0) / 3,
      balance: previousMonthsData.reduce((sum, data) => sum + data.balance, 0) / 3,
    };

    // 전월 대비 증감률 계산
    const changes = previousMonth ? {
      income: previousMonth.income > 0
        ? ((currentSummary.totalIncome - previousMonth.income) / previousMonth.income) * 100
        : 0,
      expense: previousMonth.expense > 0
        ? ((currentSummary.totalExpense - previousMonth.expense) / previousMonth.expense) * 100
        : 0,
      balance: previousMonth.balance !== 0
        ? ((currentSummary.balance - previousMonth.balance) / Math.abs(previousMonth.balance)) * 100
        : 0,
    } : null;

    return {
      current: {
        month: currentMonth,
        income: currentSummary.totalIncome,
        expense: currentSummary.totalExpense,
        balance: currentSummary.balance,
      },
      previous: previousMonth || null,
      threeMonthAverage,
      changes,
    };
  } catch (error) {
    console.error('월별 비교 데이터 계산 실패:', error);
    return null;
  }
}

function App() {
  // 인증 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  // 인증되지 않았으면 로그인 화면 표시
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const initialMonths = useMemo(() => buildRecentMonths(12), []);
  const [availableMonths, setAvailableMonths] = useState<string[]>(initialMonths);
  const [activeTab, setActiveTab] = useState<TabKey>("input");
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [quickInputMode, setQuickInputMode] = useState(false);
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
  const [apiAccounts, setApiAccounts] = useState<string[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithUsage[]>([]);
  const [isBudgetLoading, setBudgetLoading] = useState(false);

  const hasLoadedRef = useRef(false);

  // Tab order for swipe navigation
  const tabOrder: TabKey[] = ["input", "history", "summary", "budget"];

  const handleSwipeLeft = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setSlideDirection("left");
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setSlideDirection("right");
      setActiveTab(tabOrder[currentIndex - 1]);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

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

  // 사용 빈도 순으로 정렬하는 함수
  const sortByUsageFrequency = (items: string[], priorityOrder: string[]) => {
    const priorityMap = new Map(priorityOrder.map((item, index) => [item, index]));
    return [...items].sort((a, b) => {
      const aIndex = priorityMap.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = priorityMap.get(b) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  };

  // 카테고리 타입별 사용 빈도 순으로 정렬하는 함수
  const sortCategoriesByUsageFrequency = (categories: CategoryItem[]) => {
    // 사용 빈도 기준 우선순위 (실제 사용 데이터 분석 결과)
    const expensePriority = [
      "식비",
      "데이트",
      "카페/음료",
      "선물/경조사비",
      "저축/상조/보험",
      "교통비",
      "취미",
      "월세/관리비",
      "상납금",
      "여행/숙박",
      "생활/마트",
      "편의점",
      "통신비/인터넷비",
      "구독/포인트",
      "기타"
    ];

    const incomePriority = [
      "급여",
      "용돈",
      "그 외"
    ];

    const expenseMap = new Map(expensePriority.map((item, index) => [item, index]));
    const incomeMap = new Map(incomePriority.map((item, index) => [item, index]));

    return [...categories].sort((a, b) => {
      // 먼저 타입별로 그룹화 (지출이 먼저)
      if (a.type !== b.type) {
        return a.type === "지출" ? -1 : 1;
      }

      // 같은 타입 내에서 우선순위 정렬
      const priorityMap = a.type === "지출" ? expenseMap : incomeMap;
      const aIndex = priorityMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = priorityMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  };

  const loadMasterData = useCallback(async () => {
    const [accounts, categories] = await Promise.all([
      fetchAccounts(),
      fetchCategoriesWithId(),
    ]);

    // 사용 빈도 기준 우선순위 (실제 사용 데이터 분석 결과)
    const accountPriority = [
      "토스뱅크",
      "국민은행",
      "우리은행",
      "카카오페이",
      "신용카드",
      "카카오뱅크",
      "현금"
    ];

    setApiAccounts(sortByUsageFrequency(accounts, accountPriority));
    setApiCategories(sortCategoriesByUsageFrequency(categories));
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

  // 월별 비교 데이터 가져오기
  const fetchMonthlyComparison = useCallback(async () => {
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
      fetchMonthlyComparison();
    }
  }, [activeTab, fetchMonthlyComparison]);

  // Clear slide direction after animation completes
  useEffect(() => {
    if (slideDirection) {
      const timer = setTimeout(() => {
        setSlideDirection(null);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [slideDirection]);

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
    // apiCategories는 이미 타입별로 정렬되어 있음 (CategoryItem[])
    const apiCategoryNames = apiCategories.map(cat => cat.name);

    const transactionCategories = distinct(
      transactions
        .map((tx) => tx.category ?? "")
        .filter((value): value is string => value.length > 0)
    );

    // API 카테고리 순서를 유지하고, 추가로 발견된 카테고리는 뒤에 추가
    const orderedCategories: string[] = [];
    const seen = new Set<string>();

    // 먼저 API 카테고리 (이미 정렬됨)
    for (const name of apiCategoryNames) {
      if (!seen.has(name)) {
        orderedCategories.push(name);
        seen.add(name);
      }
    }

    // 추가로 거래에서 발견된 카테고리
    for (const name of transactionCategories) {
      if (!seen.has(name)) {
        orderedCategories.push(name);
        seen.add(name);
      }
    }

    return orderedCategories;
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
    const currentIndex = tabOrder.indexOf(activeTab);
    const nextIndex = tabOrder.indexOf(key);

    if (nextIndex > currentIndex) {
      setSlideDirection("left");
    } else if (nextIndex < currentIndex) {
      setSlideDirection("right");
    } else {
      setSlideDirection(null);
    }

    setActiveTab(key);
  };

  const handleFiltersChange = (next: TransactionFilterState) => {
    setFilters(next);
  };

  const handleUpdateBudget = async (id: number, targetAmount: number, account?: string) => {
    try {
      setBudgetLoading(true);
      if (id === 0 && account) {
        // ID가 0이면 아직 데이터베이스에 없는 가상 예산이므로 생성(upsert) 호출
        const color = getAccountColor(account);
        await createOrUpdateBudget({
          account,
          month: filters.month,
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
      // CSV 헤더 (원하는 순서: 날짜, 구분, 금액, 메모, 통장분류, 소비항목)
      const headers = ["날짜", "구분", "금액", "메모", "통장분류", "소비항목"];

      // 날짜를 "M월 D일 (요일)" 형식으로 변환
      const formatDateForCSV = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        // 요일 한글 변환
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = dayNames[date.getDay()];

        return `${parseInt(month)}월 ${parseInt(day)}일 (${dayOfWeek})`;
      };

      // 금액을 "₩#,###" 형식으로 변환
      const formatAmountForCSV = (amount: number) => {
        return `₩${amount.toLocaleString('ko-KR')}`;
      };

      // 데이터를 CSV 행으로 변환 (순서: 날짜, 구분, 금액, 메모, 통장분류, 소비항목)
      const rows = transactions.map(tx => [
        formatDateForCSV(tx.date),
        tx.type,
        formatAmountForCSV(tx.amount),
        (tx.memo ?? "").replace(/"/g, '""'), // 큰따옴표 이스케이프
        tx.account ?? "",
        tx.category ?? ""
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

  // CSV 파일 비교 함수 (서버 데이터와 비교)
  const handleCompareCSV = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          await processCSVFile(file, true); // compareOnly = true
        }
      };

      input.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "파일을 선택하지 못했어요.";
      setError(message);
    }
  };

  // CSV 파일 처리 함수 (공통 로직)
  const processCSVFile = async (file: File, compareOnly: boolean = false) => {
    if (!file) {
      return;
    }

    // CSV 파일인지 확인
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      throw new Error('CSV 파일만 가져올 수 있어요.');
    }

    try {
      setLoading(true);
          
          // 파일을 ArrayBuffer로 읽어서 인코딩 감지 시도
          const arrayBuffer = await file.arrayBuffer();
          const decoder = new TextDecoder('utf-8');
          let text = decoder.decode(arrayBuffer);
          
          // UTF-8로 디코딩 실패 시 (한글 깨짐) 다른 인코딩 시도
          if (text.includes('') || text.includes('')) {
            // CP949 (EUC-KR 계열) 시도
            try {
              const cp949Decoder = new TextDecoder('euc-kr');
              text = cp949Decoder.decode(arrayBuffer);
            } catch (e) {
              // 실패 시 원본 유지
            }
          }

          // BOM 제거
          const content = text.replace(/^\uFEFF/, "");

          // 개선된 CSV 파싱 함수 (큰따옴표 처리)
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                  // 이스케이프된 따옴표
                  current += '"';
                  i++; // 다음 따옴표 건너뛰기
                } else {
                  // 따옴표 시작/끝
                  inQuotes = !inQuotes;
                }
              } else if (char === ',' && !inQuotes) {
                // 쉼표로 필드 구분
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            
            // 마지막 필드 추가
            result.push(current.trim());
            
            return result;
          };

          // CSV 파싱
          const lines = content.split(/\r?\n/).filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error("CSV 파일이 비어있어요.");
          }

          // 헤더 파싱하여 형식 감지
          const headerLine = lines[0];
          const headerCells = parseCSVLine(headerLine);
          
          // 뱅크샐러드 형식 감지: "대분류", "소분류", "결제수단" 또는 "결제 수단" 등의 키워드 확인
          const isBankSaladFormat = headerCells.some(cell => 
            cell.includes('대분류') || 
            cell.includes('소분류') || 
            cell.includes('결제수단') ||
            cell.includes('결제 수단') ||
            cell.includes('화폐')
          );

          // 헤더 제외하고 데이터 행만 파싱
          const dataLines = lines.slice(1);
          const drafts: TransactionDraft[] = [];

          // 날짜 파싱 헬퍼 함수
          const parseDateFromCSV = (dateStr: string): string => {
            // 줄바꿈, 공백 등 정리
            const cleanedDateStr = dateStr.replace(/[\r\n\t]/g, ' ').trim();

            // "2025-05-01" 형식은 그대로 반환
            if (cleanedDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return cleanedDateStr;
            }

            // "5월 1일" 또는 "5월 1일 (목)" 형식 파싱 (요일 제거)
            const match = cleanedDateStr.match(/(\d+)월\s*(\d+)일/);
            if (match) {
              const monthNum = parseInt(match[1]);
              const dayNum = parseInt(match[2]);
              const month = String(monthNum).padStart(2, '0');
              const day = String(dayNum).padStart(2, '0');

              // 현재 화면의 연도/월 가져오기
              const [currentYear, currentMonth] = filters.month.split('-').map(Number);

              // 연도 추정 로직:
              // 1. 입력된 월이 현재 화면 월과 같거나 이전이면 → 같은 연도
              // 2. 입력된 월이 현재 화면 월보다 크면 → 이전 연도
              // 예: 현재 11월인데 12월 데이터 입력 → 작년 12월
              // 예: 현재 11월인데 5월 데이터 입력 → 올해 5월
              let year = currentYear;
              if (monthNum > currentMonth && currentMonth <= 3) {
                // 현재가 1~3월인데 큰 월(예: 12월)이 입력되면 작년
                year = currentYear - 1;
              }

              return `${year}-${month}-${day}`;
            }

            return "";
          };

          // 금액 파싱 헬퍼 함수
          const parseAmountFromCSV = (amountStr: string): number | null => {
            if (!amountStr || amountStr.trim() === "") return null;
            const isNegative = amountStr.trim().startsWith("-");
            const numStr = amountStr.replace(/[^0-9]/g, "");
            if (!numStr) return null; // 숫자가 없으면 null
            const amount = parseFloat(numStr);
            if (isNaN(amount) || amount === 0) return null; // NaN이거나 0이면 null
            return isNegative ? -amount : amount;
          };

          // 항목명 매핑 테이블 (결제 수단 → 통장분류)
          const accountMapping: Record<string, string> = {
            // 토스뱅크
            '토스뱅크 체크카드': '토스뱅크',
            '토스뱅크 통장': '토스뱅크',
            '토스 간편결제': '토스뱅크',
            '토뱅': '토스뱅크',
            // 카카오페이
            '카카오페이 머니': '카카오페이',
            '카카오페이 간편결제': '카카오페이',
            '카카오페이': '카카오페이',
            // 네이버페이
            '네이버페이 간편결제': '네이버페이',
            '네이버페이 간편결제(포인트)': '네이버페이',
            '네이버페이': '네이버페이',
            // 국민은행
            'KB Star*t통장-저축예금': '국민은행',
            'KB Star*t통장': '국민은행',
            'KB': '국민은행',
            '국민은행': '국민은행',
            // 삼성카드
            '삼성카드 taptap O': '삼성카드',
            '삼성카드': '삼성카드',
            // 기타
            'WON 통장': 'WON',
            '세이프박스': '세이프박스',
          };

          // 항목명 매핑 함수
          const mapAccount = (paymentMethod: string): string => {
            if (!paymentMethod) return '';
            const trimmed = paymentMethod.trim();
            
            // 정확히 일치하는 경우
            if (accountMapping[trimmed]) {
              return accountMapping[trimmed];
            }
            
            // 부분 일치 검색 (긴 키부터 우선 매칭)
            const sortedKeys = Object.keys(accountMapping).sort((a, b) => b.length - a.length);
            for (const key of sortedKeys) {
              if (trimmed.includes(key) || key.includes(trimmed)) {
                return accountMapping[key];
              }
            }
            
            // 특정 패턴 매칭
            if (trimmed.includes('토스') || trimmed.includes('토뱅')) {
              return '토스뱅크';
            }
            if (trimmed.includes('카카오')) {
              return '카카오페이';
            }
            if (trimmed.includes('네이버')) {
              return '네이버페이';
            }
            if (trimmed.includes('KB') || trimmed.includes('국민')) {
              return '국민은행';
            }
            if (trimmed.includes('삼성')) {
              return '삼성카드';
            }
            
            // 매핑 없으면 원본 반환
            return trimmed;
          };

          // 카테고리 매핑 함수 (대분류/소분류 → 소비항목)
          const mapCategory = (mainCategory: string, subCategory: string): string => {
            const main = mainCategory?.trim() || '';
            const sub = subCategory?.trim() || '';
            
            // 소분류가 있고 "미분류"가 아니면 소분류 우선
            if (sub && sub !== '미분류') {
              return sub;
            }
            
            // 대분류가 있고 "미분류"가 아니면 대분류 사용
            if (main && main !== '미분류') {
              return main;
            }
            
            // 둘 다 없거나 미분류면 빈 문자열 (가계부에서 수동 분류 필요)
            return '';
          };

          for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i];
            
            // 개선된 CSV 파싱 사용
            const cells = parseCSVLine(line);
            
            if (cells.length < 3) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 필드 수 부족 (${cells.length}개)`);
              continue;
            }

            let dateStr: string;
            let typeStr: string;
            let amountStr: string;
            let memo: string;
            let account: string;
            let category: string;

            if (isBankSaladFormat) {
              // 뱅크샐러드 형식: 날짜, 시간, 타입, 대분류, 소분류, 내용, 금액, 화폐, 결제수단, 메모
              // 헤더 인덱스 찾기 (공백 유무 모두 고려)
              const dateIdx = headerCells.findIndex(c => c.includes('날짜'));
              const typeIdx = headerCells.findIndex(c => c.includes('타입'));
              const mainCategoryIdx = headerCells.findIndex(c => c.includes('대분류'));
              const subCategoryIdx = headerCells.findIndex(c => c.includes('소분류'));
              const contentIdx = headerCells.findIndex(c => c.includes('내용'));
              const amountIdx = headerCells.findIndex(c => c.includes('금액'));
              const paymentMethodIdx = headerCells.findIndex(c => 
                c.includes('결제수단') || c.includes('결제 수단')
              );
              const memoIdx = headerCells.findIndex(c => c.includes('메모'));

              dateStr = cells[dateIdx] || '';
              typeStr = cells[typeIdx] || '';
              amountStr = cells[amountIdx] || '';
              const mainCategory = cells[mainCategoryIdx] || '';
              const subCategory = cells[subCategoryIdx] || '';
              const content = cells[contentIdx] || '';
              const paymentMethod = cells[paymentMethodIdx] || '';
              const memoValue = cells[memoIdx] || '';

              // 메모는 내용과 메모를 합침
              memo = [content, memoValue].filter(v => v).join(' ').trim();
              
              // 통장분류 매핑
              account = mapAccount(paymentMethod);
              
              // 카테고리 매핑
              category = mapCategory(mainCategory, subCategory);
            } else {
              // 가계부 형식: 날짜, 구분, 금액, 메모, 통장분류, 소비항목
              [dateStr, typeStr, amountStr, memo = "", account = "", category = ""] = cells;
            }

            // 날짜 파싱
            const date = parseDateFromCSV(dateStr);
            if (!date) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 날짜 형식 (${dateStr})`);
              continue;
            }

            // 구분 정규화: "(주)지출" → "지출", "(주)수입" → "수입"
            let type = typeStr.replace(/\(주\)/g, "").trim();

            // 유효성 검사
            if (!type) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 필수 필드 누락`);
              continue;
            }

            // 이체 거래는 제외
            if (type === "이체" || type === "이체출금" || type === "이체입금") {
              console.warn(`${i + 2}번째 줄 건너뛰기: 이체 거래는 제외 (${type})`);
              continue;
            }

            if (type !== "수입" && type !== "지출") {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 구분 (${type})`);
              continue;
            }

            const amount = parseAmountFromCSV(amountStr);
            if (amount === null || amount === 0) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 금액 또는 0원 (${amountStr})`);
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

          // CSV 데이터의 날짜 범위 파악
          const dates = drafts.map(d => d.date).sort();
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];

          // 서버에서 해당 기간의 모든 거래 내역 가져오기 (중복 체크용)
          console.log(`중복 체크를 위해 ${minDate} ~ ${maxDate} 기간의 데이터를 서버에서 가져옵니다.`);
          const existingTransactions = await fetchTransactionsByDateRange(minDate, maxDate);

          // 중복 체크 함수 (날짜, 구분, 금액, 계좌, 카테고리, 메모 모두 확인)
          const isDuplicate = (draft: TransactionDraft): boolean => {
            return existingTransactions.some(tx => {
              // 날짜 비교 (정규화된 형식)
              const txDate = tx.date.trim();
              const draftDate = draft.date.trim();
              if (txDate !== draftDate) return false;

              // 구분 비교
              if (tx.type !== draft.type) return false;

              // 금액 비교 (부동소수점 오차 허용)
              const amountDiff = Math.abs(Number(tx.amount) - Number(draft.amount));
              if (amountDiff > 0.01) return false;

              // 계좌 비교 (공백 제거 후 비교)
              const txAccount = (tx.account ?? "").trim();
              const draftAccount = (draft.account ?? "").trim();
              if (txAccount !== draftAccount) return false;

              // 카테고리 비교 (공백 제거 후 비교)
              const txCategory = (tx.category ?? "").trim();
              const draftCategory = (draft.category ?? "").trim();
              if (txCategory !== draftCategory) return false;

              // 메모 비교 (공백 제거 후 비교)
              const txMemo = (tx.memo ?? "").trim();
              const draftMemo = (draft.memo ?? "").trim();
              if (txMemo !== draftMemo) return false;

              return true;
            });
          };

          // 중복 제거
          const newDrafts = drafts.filter(draft => !isDuplicate(draft));
          const duplicateCount = drafts.length - newDrafts.length;

          // 비교 모드인 경우 통계만 표시
          if (compareOnly) {
            const totalCSV = drafts.length;
            const matchedCount = duplicateCount;
            const unmatchedCount = newDrafts.length;
            const matchRate = totalCSV > 0 ? (matchedCount / totalCSV * 100).toFixed(2) : '0.00';
            
            const message = `📊 CSV vs 서버 데이터 비교 결과\n\n` +
              `CSV 총 항목: ${totalCSV}개\n` +
              `서버 일치 항목: ${matchedCount}개\n` +
              `서버 미일치 항목: ${unmatchedCount}개\n` +
              `일치율: ${matchRate}%\n\n` +
              `기간: ${minDate} ~ ${maxDate}\n` +
              `서버 데이터: ${existingTransactions.length}개`;
            
            alert(message);
            console.log('CSV 비교 상세:', {
              csvTotal: totalCSV,
              serverTotal: existingTransactions.length,
              matched: matchedCount,
              unmatched: unmatchedCount,
              matchRate: `${matchRate}%`,
              unmatchedItems: newDrafts.slice(0, 10) // 처음 10개만 표시
            });
            return;
          }

          if (newDrafts.length === 0) {
            alert(`모든 항목이 이미 존재합니다. (중복 ${duplicateCount}개)`);
            return;
          }

          // 서버에 저장
          for (const draft of newDrafts) {
            await createTransaction(normalizeDraft(draft));
          }

          // 데이터 새로고침
          await refetch();

          // 결과 메시지
          let message = `${newDrafts.length}개의 내역을 가져왔어요.`;
          if (duplicateCount > 0) {
            message += `\n(중복 ${duplicateCount}개는 건너뛰었어요.)`;
          }
          alert(message);
          setActiveTab("history");
        } catch (err) {
          const message = err instanceof Error ? err.message : "CSV 가져오기에 실패했어요.";
          setError(message);
        } finally {
          setLoading(false);
        }
      };

  const handleImportCSV = () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,.xlsx,.xls";

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          await processCSVFile(file);
        }
      };

      input.click();
    } catch (err) {
      const message = err instanceof Error ? err.message : "파일을 선택하지 못했어요.";
      setError(message);
    }
  };

  // 드래그 앤 드롭 핸들러
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.toLowerCase().endsWith('.csv'));

    if (csvFile) {
      await processCSVFile(csvFile);
    } else if (files.length > 0) {
      setError('CSV 파일만 드롭할 수 있어요.');
    }
  };

  return (
    <div 
      className={`app-shell ${isDragging ? 'app-shell--dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="app-container" {...swipeHandlers}>
        <Header
          onClickTitle={() => setActiveTab("input")}
          onExportCSV={handleExportCSV}
          onImportCSV={handleImportCSV}
          onCompareCSV={handleCompareCSV}
        />
        <TabNavigation tabs={tabs} activeTab={activeTab} onSelect={handleTabChange} />

        <section className={`tab-panel tab-panel--input ${activeTab === "input" ? "tab-panel--active" : ""} ${activeTab === "input" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
          {activeTab === "input" ? (
            <>
              {error && <div className="alert alert--error">{error}</div>}
              <TransactionForm
                accounts={accounts}
                categories={apiCategories}
                onSubmit={handleCreate}
                submitting={isSubmitting && !isEditModalOpen}
                submitLabel="내역 저장"
                quickInputMode={quickInputMode}
                onQuickInputModeChange={setQuickInputMode}
              />
            </>
          ) : null}
        </section>

        <section className={`tab-panel tab-panel--history ${activeTab === "history" ? "tab-panel--active" : ""} ${activeTab === "history" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
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

        <section className={`tab-panel tab-panel--summary ${activeTab === "summary" ? "tab-panel--active" : ""} ${activeTab === "summary" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
          {activeTab === "summary" ? (
            <SummaryPanel
              summary={summary}
              loading={isLoading}
              currentMonth={filters.month}
              availableMonths={availableMonths}
              onMonthChange={(month) => setFilters((prev) => ({ ...prev, month }))}
              monthlyComparison={monthlyComparison}
            />
          ) : null}
        </section>

        <section className={`tab-panel tab-panel--budget ${activeTab === "budget" ? "tab-panel--active" : ""} ${activeTab === "budget" && slideDirection ? `tab-panel--slide-in-${slideDirection}` : ""}`}>
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
        categories={apiCategories}
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
