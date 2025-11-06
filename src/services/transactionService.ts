import httpClient from "./httpClient";
import type {
  Transaction,
  TransactionDraft,
  TransactionSummary,
} from "../types";
import { getMonthRange } from "../utils/formatters";

interface BackendTransaction {
  id: number;
  date: string;
  type: string;
  account?: string | null;
  category?: string | null;
  amount: number | string;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeTransaction(raw: BackendTransaction): Transaction {
  const amount = typeof raw.amount === "string" ? Number(raw.amount.replace(/,/g, "")) : Number(raw.amount);

  return {
    id: raw.id,
    date: raw.date,
    type: raw.type === "수입" || raw.type === "지출" ? (raw.type as Transaction["type"]) : raw.type === "INCOME" ? "수입" : "지출",
    account: raw.account ?? null,
    category: raw.category ?? null,
    amount: Number.isFinite(amount) ? amount : 0,
    memo: raw.memo ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function ensureOk(data: any, fallback: string): void {
  if (data && typeof data === "object" && "ok" in data && data.ok === false) {
    throw new Error(typeof data.error === "string" ? data.error : fallback);
  }
}

export async function fetchTransactionsByMonth(month: string): Promise<Transaction[]> {
  const { from, to } = getMonthRange(month);
  const response = await httpClient.get("/transactions", { params: { from, to } });
  const { data } = response;
  ensureOk(data, "거래 내역을 불러오지 못했어요.");

  const rows: BackendTransaction[] = Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data)
      ? (data as BackendTransaction[])
      : [];

  return rows.map(normalizeTransaction);
}

export async function createTransaction(payload: TransactionDraft): Promise<void> {
  const body = {
    date: payload.date,
    type: payload.type,
    account: payload.account || null,
    category: payload.category || null,
    memo: payload.memo || null,
    amount: payload.amount,
  };

  const response = await httpClient.post("/transactions", body);
  ensureOk(response.data, "내역을 저장하지 못했어요.");
}

export async function updateTransaction(id: number, payload: TransactionDraft): Promise<void> {
  const body = {
    date: payload.date,
    type: payload.type,
    account: payload.account || null,
    category: payload.category || null,
    memo: payload.memo || null,
    amount: payload.amount,
  };

  const response = await httpClient.put(`/transactions/${id}`, body);
  ensureOk(response.data, "내역을 수정하지 못했어요.");
}

export async function deleteTransaction(id: number): Promise<void> {
  const response = await httpClient.delete(`/transactions/${id}`);
  ensureOk(response.data, "내역을 삭제하지 못했어요.");
}

export async function fetchSummary(month: string): Promise<TransactionSummary | null> {
  const { from, to } = getMonthRange(month);
  try {
    const response = await httpClient.get("/summary", { params: { from, to } });
    const data = response.data;
    ensureOk(data, "요약 정보를 불러오지 못했어요.");
    const summary = data?.summary ?? data;
    if (!summary) {
      return null;
    }
    return {
      totalIncome: Number(summary.totalIncome ?? summary.income ?? 0),
      totalExpense: Number(summary.totalExpense ?? summary.expense ?? 0),
      balance: Number(summary.balance ?? (summary.totalIncome ?? summary.income ?? 0) - (summary.totalExpense ?? summary.expense ?? 0)),
      categories: summary.categories ?? summary.categoryBreakdown ?? [],
      accounts: summary.accounts ?? summary.accountBreakdown ?? [],
      periodLabel: summary.periodLabel,
    };
  } catch (error) {
    // summary endpoint optional
    return null;
  }
}

export async function fetchAccounts(): Promise<string[]> {
  try {
    const response = await httpClient.get("/accounts");
    const data = response.data;
    ensureOk(data, "계좌 목록을 불러오지 못했어요.");

    const accounts = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
    return accounts.map((item: any) => item.name || item).filter((name: string) => name);
  } catch (error) {
    // Return empty array if API fails
    return [];
  }
}

export async function fetchCategories(): Promise<string[]> {
  try {
    const response = await httpClient.get("/categories");
    const data = response.data;
    ensureOk(data, "카테고리 목록을 불러오지 못했어요.");

    const categories = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
    return categories.map((item: any) => item.name || item).filter((name: string) => name);
  } catch (error) {
    // Return empty array if API fails
    return [];
  }
}

// Category Management APIs
export interface CategoryItem {
  id: number;
  name: string;
}

export interface AccountItem {
  id: number;
  name: string;
}

export async function fetchAccountsWithId(): Promise<AccountItem[]> {
  const response = await httpClient.get("/accounts");
  const data = response.data;
  ensureOk(data, "계좌 목록을 불러오지 못했어요.");
  const accounts = Array.isArray(data?.rows) ? data.rows : [];
  return accounts;
}

export async function fetchCategoriesWithId(): Promise<CategoryItem[]> {
  const response = await httpClient.get("/categories");
  const data = response.data;
  ensureOk(data, "카테고리 목록을 불러오지 못했어요.");
  const categories = Array.isArray(data?.rows) ? data.rows : [];
  return categories;
}

export async function createAccount(name: string): Promise<void> {
  const response = await httpClient.post("/accounts", { name });
  ensureOk(response.data, "계좌를 생성하지 못했어요.");
}

export async function deleteAccount(id: number): Promise<void> {
  const response = await httpClient.delete(`/accounts/${id}`);
  ensureOk(response.data, "계좌를 삭제하지 못했어요.");
}

export async function createCategory(name: string): Promise<void> {
  const response = await httpClient.post("/categories", { name });
  ensureOk(response.data, "카테고리를 생성하지 못했어요.");
}

export async function deleteCategory(id: number): Promise<void> {
  const response = await httpClient.delete(`/categories/${id}`);
  ensureOk(response.data, "카테고리를 삭제하지 못했어요.");
}

