import pool from '../config/database';

export interface Budget {
  id: number;
  account: string;
  month: string; // yyyy-mm
  target_amount: number;
  color: string;
  is_custom: boolean;
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
    // 1. 현재 월의 커스텀 예산 조회
    const [customBudgetRows] = await pool.execute(
      `SELECT * FROM budgets WHERE month = ? AND is_custom = TRUE ORDER BY account`,
      [month]
    );

    const customBudgets = customBudgetRows as Budget[];

    // 2. 전월 계산
    const [year, monthNum] = month.split('-').map(Number);
    const prevMonth = monthNum === 1
      ? `${year - 1}-12`
      : `${year}-${String(monthNum - 1).padStart(2, '0')}`;

    // 3. 전월의 모든 예산 조회
    let [prevBudgetRows] = await pool.execute(
      `SELECT * FROM budgets WHERE month = ? ORDER BY account`,
      [prevMonth]
    );

    let prevBudgets = prevBudgetRows as Budget[];

    // 4. 전월에 데이터가 없으면 가장 최근 월의 데이터 조회
    if (prevBudgets.length === 0) {
      const [latestBudgetRows] = await pool.execute(
        `SELECT * FROM budgets
         WHERE month < ?
         ORDER BY month DESC, account
         LIMIT 100`,
        [month]
      );
      prevBudgets = latestBudgetRows as Budget[];
    }

    // 5. 병합: 커스텀이 있으면 사용, 없으면 전월 데이터 사용
    const accountMap = new Map<string, Budget>();

    // 전월 데이터를 기본으로 (단, 현재 월로 변경)
    let virtualId = -1; // 음수 ID로 시작 (커스텀 데이터와 구분)
    for (const prevBudget of prevBudgets) {
      accountMap.set(prevBudget.account, {
        ...prevBudget,
        id: virtualId--, // 고유한 음수 ID 생성 (-1, -2, -3, ...)
        month, // 현재 월로 변경
        is_custom: false
      });
    }

    // 커스텀 데이터로 덮어쓰기
    for (const customBudget of customBudgets) {
      accountMap.set(customBudget.account, customBudget);
    }

    const budgets = Array.from(accountMap.values()).map(b => ({
      ...b,
      target_amount: Number(b.target_amount)
    }));

    // 월의 시작일과 종료일 계산
    const [_year, _monthNum] = month.split('-').map(Number);
    const startDate = `${month}-01`;
    const lastDay = new Date(_year, _monthNum, 0).getDate();
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
      `INSERT INTO budgets (account, month, target_amount, color, is_custom)
       VALUES (?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
       target_amount = VALUES(target_amount),
       color = VALUES(color),
       is_custom = TRUE`,
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
