import pool from '../config/database';

export interface Account {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export class AccountModel {
  static async findAll(): Promise<Account[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM accounts ORDER BY name'
    );
    return rows as Account[];
  }

  static async findByName(name: string): Promise<Account | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM accounts WHERE name = ?',
      [name]
    );
    const accounts = rows as Account[];
    return accounts[0] || null;
  }

  static async create(name: string): Promise<Account> {
    const [result] = await pool.execute(
      'INSERT INTO accounts (name) VALUES (?)',
      [name]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute(
      'SELECT * FROM accounts WHERE id = ?',
      [insertId]
    );

    return (rows as Account[])[0];
  }

  static async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM accounts WHERE id = ?', [id]);
  }
}
