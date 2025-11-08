import axios from 'axios';
import type { ExpensePlan, ExpensePlanDraft, ExpensePlanTotal } from '../types/expensePlan';

const API_URL = '';

export const expensePlanService = {
  async getPlans(month: string, account?: string): Promise<ExpensePlan[]> {
    const params = account ? { month, account } : { month };
    const response = await axios.get(`${API_URL}/api/expense-plans`, { params });
    return response.data.plans || [];
  },

  async createPlan(plan: ExpensePlanDraft): Promise<ExpensePlan> {
    const response = await axios.post(`${API_URL}/api/expense-plans`, plan);
    return response.data.data;
  },

  async updatePlan(id: number, updates: Partial<ExpensePlanDraft & { is_checked: boolean }>): Promise<ExpensePlan> {
    const response = await axios.put(`${API_URL}/api/expense-plans/${id}`, updates);
    return response.data.data;
  },

  async deletePlan(id: number): Promise<void> {
    await axios.delete(`${API_URL}/api/expense-plans/${id}`);
  },

  async getPlannedTotal(month: string, account?: string): Promise<ExpensePlanTotal> {
    const params = account ? { month, account } : { month };
    const response = await axios.get(`${API_URL}/api/expense-plans/total`, { params });
    const data = response.data.data;
    return {
      total: data.total_planned,
      checked: data.checked_total,
      remaining: data.remaining
    };
  }
};
