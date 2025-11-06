export type TransactionType = "수입" | "지출";

export interface Transaction {
  id: number;
  date: string; // yyyy-mm-dd
  type: TransactionType;
  account: string | null;
  category: string | null;
  amount: number;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionDraft {
  date: string;
  type: TransactionType;
  account: string;
  category: string;
  amount: number;
  memo?: string;
}

export interface TransactionFilterState {
  month: string; // yyyy-mm
  type: TransactionType | "ALL";
  account: string | "ALL";
  category: string | "ALL";
  keyword: string;
}

export interface CategoryBreakdownItem {
  category: string;
  income: number;
  expense: number;
}

export interface AccountBreakdownItem {
  account: string;
  income: number;
  expense: number;
}

export interface SpecialStatsItem {
  label: string;
  amount: number;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  periodLabel?: string;
  categories?: CategoryBreakdownItem[];
  accounts?: AccountBreakdownItem[];
  specialStats?: SpecialStatsItem[];
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface TransactionsListResponse {
  rows: Transaction[];
}

export interface SummaryResponse {
  summary: TransactionSummary & {
    monthlyIncome?: number;
    monthlyExpense?: number;
    monthlyBalance?: number;
  };
}
