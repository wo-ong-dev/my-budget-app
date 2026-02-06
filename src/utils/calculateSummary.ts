import type { Transaction, TransactionSummary } from "../types";

export function calculateSummary(transactions: Transaction[], month?: string): TransactionSummary {
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

export function normalizeDraft(draft: import("../types").TransactionDraft): import("../types").TransactionDraft {
  return {
    ...draft,
    amount: Math.abs(Math.round(draft.amount)),
  };
}

export async function calculateMonthlyComparison(
  currentMonth: string,
  fetchTransactionsFn: (month: string) => Promise<Transaction[]>
): Promise<import("../types").MonthlyComparison | null> {
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
