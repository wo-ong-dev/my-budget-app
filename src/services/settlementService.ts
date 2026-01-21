import httpClient from "./httpClient";
import type { SettlementData } from "../types";
import type { CommitRebalanceDecision, RebalanceSuggestionsResponse } from "../types";

export async function fetchSettlement(month: string): Promise<SettlementData> {
  const response = await httpClient.get<{ ok: boolean; data: SettlementData }>(
    `/settlements?month=${month}`
  );
  return response.data.data;
}

export async function fetchRebalanceSuggestions(month: string): Promise<RebalanceSuggestionsResponse> {
  const response = await httpClient.get<{ ok: boolean; data: RebalanceSuggestionsResponse }>(
    `/settlements/rebalance?month=${month}`
  );
  return response.data.data;
}

export async function commitRebalance(month: string, decisions: CommitRebalanceDecision[]): Promise<void> {
  await httpClient.post(`/settlements/rebalance/commit`, { month, decisions });
}
