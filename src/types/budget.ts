export interface Budget {
  id: number;
  account: string;
  month: string; // yyyy-mm
  target_amount: number;
  color: string;
  is_custom: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetDraft {
  account: string;
  month: string;
  target_amount: number;
  color?: string;
}

export interface BudgetWithUsage extends Budget {
  used_amount: number;
  available_amount: number;
}
