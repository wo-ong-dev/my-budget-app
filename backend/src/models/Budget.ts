import pool from '../config/database';

export interface Budget {
  id: number;
  account: string;
  month: string; // yyyy-mm
  target_amount: number;
  color: string;
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

export class BudgetModel {
  static async findByMonth(month: string): Promise<BudgetWithUsage[]> {
    // 예산 정보 조회
    const [budgetRows] = await pool.execute(
      `SELECT * FROM budgets WHERE month = ? ORDER BY account`,
      [month]
    );

    const budgets = (budgetRows as Budget[]).map(b => ({
      ...b,
      target_amount: Number(b.target_amount)
    }));

    // 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${month}-01`;
    // 다음 달의 0일 = 이번 달의 마지막 날
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // 각 계좌별 사용 금액 조회
    const result: BudgetWithUsage[] = [];

    for (const budget of budgets) {
      const [usageRows] = await pool.execute(
        `SELECT SUM(amount) as used_amount
         FROM transactions
         WHERE account = ?
           AND DATE(date) >= ?
           AND DATE(date) <= ?
           AND type = '지출'`,
        [budget.account, startDate, endDate]
      );

      const usage = (usageRows as any[])[0];
      const used_amount = Number(usage.used_amount) || 0;

      console.log(`[Budget] Account: ${budget.account}, Period: ${startDate} ~ ${endDate}, Used: ${used_amount}`);

      result.push({
        ...budget,
        used_amount,
        available_amount: budget.target_amount - used_amount
      });
    }

    return result;
  }

  static async findByAccountAndMonth(account: string, month: string): Promise<Budget | null> {
    const [rows] = await pool.execute(
      `SELECT * FROM budgets WHERE account = ? AND month = ?`,
      [account, month]
    );

    const budgets = rows as Budget[];
    if (budgets.length === 0) return null;

    return {
      ...budgets[0],
      target_amount: Number(budgets[0].target_amount)
    };
  }

  static async create(budget: BudgetDraft): Promise<Budget> {
    const [result] = await pool.execute(
      `INSERT INTO budgets (account, month, target_amount, color)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       target_amount = VALUES(target_amount),
       color = VALUES(color)`,
      [
        budget.account,
        budget.month,
        budget.target_amount,
        budget.color || 'blue'
      ]
    );

    // UPSERT이므로 insertId가 없을 수 있음
    const [rows] = await pool.execute(
      'SELECT * FROM budgets WHERE account = ? AND month = ?',
      [budget.account, budget.month]
    );

    const created = (rows as Budget[])[0];
    return {
      ...created,
      target_amount: Number(created.target_amount)
    };
  }

  static async update(id: number, budget: Partial<BudgetDraft>): Promise<Budget> {
    const updates: string[] = [];
    const values: any[] = [];

    if (budget.target_amount !== undefined) {
      updates.push('target_amount = ?');
      values.push(budget.target_amount);
    }
    if (budget.color !== undefined) {
      updates.push('color = ?');
      values.push(budget.color);
    }

    if (updates.length === 0) {
      throw new Error('업데이트할 필드가 없습니다.');
    }

    values.push(id);

    await pool.execute(
      `UPDATE budgets SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute(
      'SELECT * FROM budgets WHERE id = ?',
      [id]
    );

    const updated = (rows as Budget[])[0];
    return {
      ...updated,
      target_amount: Number(updated.target_amount)
    };
  }

  static async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM budgets WHERE id = ?', [id]);
  }

  static async deleteByAccountAndMonth(account: string, month: string): Promise<void> {
    await pool.execute('DELETE FROM budgets WHERE account = ? AND month = ?', [account, month]);
  }
}
