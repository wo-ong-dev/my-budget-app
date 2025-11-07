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
  MonthlyComparison,
} from "./types";
import { buildRecentMonths, distinct, monthKey, todayInputValue } from "./utils/formatters";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactionsByMonth,
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

          // 날짜 파싱 헬퍼 함수
          const parseDateFromCSV = (dateStr: string): string => {
            // "2025-05-01" 형식은 그대로 반환
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              return dateStr;
            }

            // "5월 1일" 또는 "5월 1일 (목)" 형식 파싱 (요일 제거)
            const match = dateStr.match(/(\d+)월\s*(\d+)일/);
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
          const parseAmountFromCSV = (amountStr: string): number => {
            // "₩10,000" 또는 "10000" 형식 처리
            const cleaned = amountStr.replace(/[₩,\s]/g, "");
            return parseFloat(cleaned);
          };

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

            // 새로운 순서: 날짜, 구분, 금액, 메모, 통장분류, 소비항목
            let [dateStr, typeStr, amountStr, memo, account, category] = cells;

            // 날짜 파싱
            const date = parseDateFromCSV(dateStr);
            if (!date) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 날짜 형식 (${dateStr})`);
              continue;
            }

            // 구분 정규화: "(주)지출" → "지출", "(주)수입" → "수입"
            let type = typeStr.replace(/\(주\)/g, "").trim();

            // 유효성 검사
            if (!type || !amountStr) {
              console.warn(`${i + 2}번째 줄 건너뛰기: 필수 필드 누락`);
              continue;
            }

            if (type !== "수입" && type !== "지출") {
              console.warn(`${i + 2}번째 줄 건너뛰기: 잘못된 구분 (${type})`);
              continue;
            }

            const amount = parseAmountFromCSV(amountStr);
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

          // 기존 거래 내역 가져오기 (중복 체크용)
          const existingTransactions = transactions;

          // 중복 체크 함수
          const isDuplicate = (draft: TransactionDraft): boolean => {
            return existingTransactions.some(tx =>
              tx.date === draft.date &&
              tx.type === draft.type &&
              tx.amount === draft.amount &&
              (tx.account ?? "") === (draft.account ?? "") &&
              (tx.category ?? "") === (draft.category ?? "")
            );
          };

          // 중복 제거
          const newDrafts = drafts.filter(draft => !isDuplicate(draft));
          const duplicateCount = drafts.length - newDrafts.length;

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
                categories={apiCategories}
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
              monthlyComparison={monthlyComparison}
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
