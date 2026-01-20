import httpClient from "./httpClient";
import type { SettlementData } from "../types";

export async function fetchSettlement(month: string): Promise<SettlementData> {
  const response = await httpClient.get<{ ok: boolean; data: SettlementData }>(
    `/settlements?month=${month}`
  );
  return response.data.data;
}
