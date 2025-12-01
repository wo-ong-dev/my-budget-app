import pool from '../config/database';

export interface ExpensePlan {
  id: number;
  account: string;
  month: string; // yyyy-mm
  name: string;
  amount: number;
  due_day: number | null;
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

export class ExpensePlanModel {
  static async findByAccountAndMonth(account: string, month: string): Promise<ExpensePlan[]> {
    const [rows] = await pool.execute(
      `SELECT * FROM expense_plans WHERE account = ? AND month = ? ORDER BY due_day, name`,
      [account, month]
    );

    return (rows as ExpensePlan[]).map(p => ({
      ...p,
      amount: Number(p.amount),
      is_checked: Boolean(p.is_checked)
    }));
  }

  static async findByMonth(month: string): Promise<ExpensePlan[]> {
    const [rows] = await pool.execute(
      `SELECT * FROM expense_plans WHERE month = ? ORDER BY account, due_day, name`,
      [month]
    );

    return (rows as ExpensePlan[]).map(p => ({
      ...p,
      amount: Number(p.amount),
      is_checked: Boolean(p.is_checked)
    }));
  }

  static async create(plan: ExpensePlanDraft): Promise<ExpensePlan> {
    const [result] = await pool.execute(
      `INSERT INTO expense_plans (account, month, name, amount, due_day)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       amount = VALUES(amount),
       due_day = VALUES(due_day)`,
      [
        plan.account,
        plan.month,
        plan.name,
        plan.amount,
        plan.due_day || null
      ]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM expense_plans WHERE account = ? AND month = ? AND name = ?',
      [plan.account, plan.month, plan.name]
    );

    const created = (rows as ExpensePlan[])[0];
    return {
      ...created,
      amount: Number(created.amount),
      is_checked: Boolean(created.is_checked)
    };
  }

  static async update(id: number, updates: Partial<ExpensePlanDraft & { is_checked: boolean }>): Promise<ExpensePlan> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.due_day !== undefined) {
      fields.push('due_day = ?');
      values.push(updates.due_day);
    }
    if (updates.is_checked !== undefined) {
      fields.push('is_checked = ?');
      values.push(updates.is_checked);
    }

    if (fields.length === 0) {
      throw new Error('업데이트할 필드가 없습니다.');
    }

    values.push(id);

    await pool.execute(
      `UPDATE expense_plans SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute(
      'SELECT * FROM expense_plans WHERE id = ?',
      [id]
    );

    const updated = (rows as ExpensePlan[])[0];
    return {
      ...updated,
      amount: Number(updated.amount),
      is_checked: Boolean(updated.is_checked)
    };
  }

  static async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM expense_plans WHERE id = ?', [id]);
  }

  static async deleteByAccountAndMonth(account: string, month: string): Promise<void> {
    await pool.execute(
      'DELETE FROM expense_plans WHERE account = ? AND month = ?',
      [account, month]
    );
  }

  // 계좌별 월간 계획된 지출 총액
  static async getTotalPlannedByAccountAndMonth(account: string, month: string): Promise<number> {
    const [rows] = await pool.execute(
      `SELECT SUM(amount) as total FROM expense_plans WHERE account = ? AND month = ?`,
      [account, month]
    );

    const result = (rows as any[])[0];
    return Number(result.total) || 0;
  }

  // 계좌별 체크된 항목의 총액
  static async getCheckedTotalByAccountAndMonth(account: string, month: string): Promise<number> {
    const [rows] = await pool.execute(
      `SELECT SUM(amount) as total FROM expense_plans
       WHERE account = ? AND month = ? AND is_checked = TRUE`,
      [account, month]
    );

    const result = (rows as any[])[0];
    return Number(result.total) || 0;
  }

  static async cloneMonthPlans(sourceMonth: string, targetMonth: string): Promise<ExpensePlan[]> {
    if (sourceMonth === targetMonth) {
      return this.findByMonth(targetMonth);
    }

    const templates = await this.findByMonth(sourceMonth);
    if (!templates.length) {
      return [];
    }

    for (const template of templates) {
      await this.create({
        account: template.account,
        month: targetMonth,
        name: template.name,
        amount: template.amount,
        due_day: template.due_day ?? undefined
      });
    }

    return this.findByMonth(targetMonth);
  }
}
