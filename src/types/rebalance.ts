export type RebalanceDecision = "APPLY" | "DEFER" | "WRONG";
export type RebalanceLearningScope = "NONE" | "PATTERN" | "CATEGORY";

export interface RebalanceSuggestionItem {
  transaction_id: number;
  date: string;
  type: "수입" | "지출";
  amount: number;
  category: string | null;
  memo: string | null;
  original_account: string | null;
  suggested_account: string | null;
  pattern_key: string | null;
  reason: string;
}

export interface RebalanceSuggestionsResponse {
  month: string;
  total: number;
  suggestions: RebalanceSuggestionItem[];
}

export interface CommitRebalanceDecision {
  transactionId: number;
  decision: RebalanceDecision;
  chosenAccount?: string | null;
  learningScope?: RebalanceLearningScope;
}

