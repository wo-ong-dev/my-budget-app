import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAccounts,
  fetchCategoriesWithId,
  type CategoryItem,
} from "../services/transactionService";
import type { Transaction } from "../types";
import { distinct } from "../utils/formatters";

// 사용 빈도 순으로 정렬하는 함수
function sortByUsageFrequency(items: string[], priorityOrder: string[]) {
  const priorityMap = new Map(priorityOrder.map((item, index) => [item, index]));
  return [...items].sort((a, b) => {
    const aIndex = priorityMap.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = priorityMap.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

// 카테고리 타입별 사용 빈도 순으로 정렬하는 함수
function sortCategoriesByUsageFrequency(categories: CategoryItem[]) {
  const expensePriority = [
    "식비", "데이트", "카페/음료", "선물/경조사비", "저축/상조/보험",
    "교통비", "취미", "월세/관리비", "상납금", "여행/숙박",
    "생활/마트", "편의점", "통신비/인터넷비", "구독/포인트", "기타"
  ];

  const incomePriority = ["급여", "용돈", "그 외"];

  const expenseMap = new Map(expensePriority.map((item, index) => [item, index]));
  const incomeMap = new Map(incomePriority.map((item, index) => [item, index]));

  return [...categories].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "지출" ? -1 : 1;
    }
    const priorityMap = a.type === "지출" ? expenseMap : incomeMap;
    const aIndex = priorityMap.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = priorityMap.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

const accountPriority = [
  "토스뱅크", "국민은행", "우리은행", "카카오페이",
  "신용카드", "카카오뱅크", "현금"
];

const defaultAccounts = [
  "국민은행", "토스뱅크", "우리은행", "신용카드",
  "카카오페이", "카카오뱅크", "현금",
];

export function useMasterData(transactions: Transaction[]) {
  const [apiAccounts, setApiAccounts] = useState<string[]>([]);
  const [apiCategories, setApiCategories] = useState<CategoryItem[]>([]);

  const loadMasterData = useCallback(async () => {
    const [accounts, categories] = await Promise.all([
      fetchAccounts(),
      fetchCategoriesWithId(),
    ]);
    setApiAccounts(sortByUsageFrequency(accounts, accountPriority));
    setApiCategories(sortCategoriesByUsageFrequency(categories));
  }, []);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  const accounts = useMemo(() => {
    const transactionAccounts = distinct(
      transactions
        .map((tx) => tx.account ?? "")
        .filter((value): value is string => value.length > 0)
    );
    return distinct([...defaultAccounts, ...apiAccounts, ...transactionAccounts]).sort();
  }, [transactions, apiAccounts]);

  const categories = useMemo(() => {
    const apiCategoryNames = apiCategories.map(cat => cat.name);
    const transactionCategories = distinct(
      transactions
        .map((tx) => tx.category ?? "")
        .filter((value): value is string => value.length > 0)
    );

    const orderedCategories: string[] = [];
    const seen = new Set<string>();

    for (const name of apiCategoryNames) {
      if (!seen.has(name)) {
        orderedCategories.push(name);
        seen.add(name);
      }
    }

    for (const name of transactionCategories) {
      if (!seen.has(name)) {
        orderedCategories.push(name);
        seen.add(name);
      }
    }

    return orderedCategories;
  }, [transactions, apiCategories]);

  return {
    accounts,
    categories,
    apiCategories,
    loadMasterData,
  };
}
