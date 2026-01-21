import pool from '../config/database';

export interface Transaction {
  id: number;
  date: string;
  type: '수입' | '지출';
  account?: string | null;
  category?: string | null;
  amount: number;
  memo?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionDraft {
  date: string;
  type: '수입' | '지출';
  account?: string | null;
  category?: string | null;
  amount: number;
  memo?: string | null;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  periodLabel?: string;
  categories: Array<{
    category: string;
    income: number;
    expense: number;
  }>;
  accounts: Array<{
    account: string;
    income: number;
    expense: number;
  }>;
}

export class TransactionModel {
  // Helper function to get or create account_id from account name
  private static async getAccountId(accountName: string | null | undefined): Promise<number | null> {
    if (!accountName) return null;

    // Try to find existing account
    const [rows] = await pool.execute(
      'SELECT id FROM accounts WHERE name = ?',
      [accountName]
    );

    const accounts = rows as any[];
    if (accounts[0]?.id) {
      return accounts[0].id;
    }

    // If not found, create new account
    const [result] = await pool.execute(
      'INSERT INTO accounts (name) VALUES (?)',
      [accountName]
    );

    return (result as any).insertId;
  }

  // Helper function to get or create category_id from category name
  private static async getCategoryId(categoryName: string | null | undefined): Promise<number | null> {
    if (!categoryName) return null;

    // Try to find existing category
    const [rows] = await pool.execute(
      'SELECT id FROM categories WHERE name = ?',
      [categoryName]
    );

    const categories = rows as any[];
    if (categories[0]?.id) {
      return categories[0].id;
    }

    // If not found, create new category
    const [result] = await pool.execute(
      'INSERT INTO categories (name) VALUES (?)',
      [categoryName]
    );

    return (result as any).insertId;
  }

  static async findByMonthRange(from: string, to: string): Promise<Transaction[]> {
    const [rows] = await pool.execute(
      `SELECT * FROM transactions
       WHERE date BETWEEN ? AND ?
       ORDER BY date DESC, id DESC`,
      [from, to]
    );

    return rows as Transaction[];
  }

  static async create(transaction: TransactionDraft): Promise<Transaction> {
    // Get foreign key IDs
    const accountId = await this.getAccountId(transaction.account);
    const categoryId = await this.getCategoryId(transaction.category);

    const [result] = await pool.execute(
      `INSERT INTO transactions (date, type, account_id, category_id, account, category, amount, memo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.date,
        transaction.type,
        accountId,
        categoryId,
        transaction.account || null,
        transaction.category || null,
        transaction.amount,
        transaction.memo || null
      ]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [insertId]
    );

    return (rows as Transaction[])[0];
  }

  static async update(id: number, transaction: TransactionDraft): Promise<Transaction> {
    // Get foreign key IDs
    const accountId = await this.getAccountId(transaction.account);
    const categoryId = await this.getCategoryId(transaction.category);

    await pool.execute(
      `UPDATE transactions
       SET date = ?, type = ?, account_id = ?, category_id = ?, account = ?, category = ?, amount = ?, memo = ?
       WHERE id = ?`,
      [
        transaction.date,
        transaction.type,
        accountId,
        categoryId,
        transaction.account || null,
        transaction.category || null,
        transaction.amount,
        transaction.memo || null,
        id
      ]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );

    return (rows as Transaction[])[0];
  }

  static async updateAccountOnly(id: number, nextAccount: string | null): Promise<Transaction> {
    const [rows] = await pool.execute('SELECT * FROM transactions WHERE id = ?', [id]);
    const existing = (rows as Transaction[])[0];
    if (!existing) {
      throw new Error('거래 내역을 찾을 수 없습니다.');
    }

    const nextDraft: TransactionDraft = {
      date: existing.date,
      type: existing.type,
      account: nextAccount,
      category: existing.category ?? null,
      amount: Number(existing.amount),
      memo: existing.memo ?? null
    };

    return await this.update(id, nextDraft);
  }

  static async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM transactions WHERE id = ?', [id]);
  }

  static async getSummary(from: string, to: string): Promise<TransactionSummary> {
    const [totalRows] = await pool.execute(
      `SELECT 
         SUM(CASE WHEN type = '수입' THEN amount ELSE 0 END) as totalIncome,
         SUM(CASE WHEN type = '지출' THEN amount ELSE 0 END) as totalExpense
       FROM transactions 
       WHERE date BETWEEN ? AND ?`,
      [from, to]
    );
    
    const totals = (totalRows as any[])[0];
    const totalIncome = Number(totals.totalIncome) || 0;
    const totalExpense = Number(totals.totalExpense) || 0;
    
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: [],
      accounts: []
    };
  }
}