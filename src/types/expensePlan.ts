export interface ExpensePlan {
  id: number;
  account: string;
  month: string; // yyyy-mm
  name: string;
  amount: number;
  due_day: number;
  is_checked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExpensePlanDraft {
  account: string;
  month: string;
  name: string;
  amount: number;
  due_day?: number;
}

export interface ExpensePlanTotal {
  total: number;
  checked: number;
  remaining: number;
}
