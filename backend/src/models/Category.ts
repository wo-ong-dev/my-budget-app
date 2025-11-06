import pool from '../config/database';

export interface Category {
  id: number;
  name: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export class CategoryModel {
  static async findAll(): Promise<Category[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM categories ORDER BY type, name'
    );
    return rows as Category[];
  }

  static async findByName(name: string): Promise<Category | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM categories WHERE name = ?',
      [name]
    );
    const categories = rows as Category[];
    return categories[0] || null;
  }

  static async create(name: string, type: string): Promise<Category> {
    const [result] = await pool.execute(
      'INSERT INTO categories (name, type) VALUES (?, ?)',
      [name, type]
    );

    const insertId = (result as any).insertId;
    const [rows] = await pool.execute(
      'SELECT * FROM categories WHERE id = ?',
      [insertId]
    );

    return (rows as Category[])[0];
  }

  static async delete(id: number): Promise<void> {
    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
  }
}
