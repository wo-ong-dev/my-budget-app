export interface SettlementSuggestion {
  from_account: string;
  to_account: string;
  amount: number;
  reason: string;
}

export interface TransferTransaction {
  id: number;
  date: string;
  from_account: string;
  to_account: string;
  amount: number;
  memo: string;
}

export interface SettlementData {
  suggestions: SettlementSuggestion[];
  transfers: TransferTransaction[];
  summary: {
    total_surplus: number;
    total_deficit: number;
    balanced: boolean;
  };
}
