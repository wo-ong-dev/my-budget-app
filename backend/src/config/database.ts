import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'my_budget',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const pool = mysql.createPool(dbConfig);

export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 데이터베이스 연결 성공');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    return false;
  }
};

export const initializeTables = async (): Promise<void> => {
  try {
    // budgets 테이블 생성 (없을 경우에만)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account VARCHAR(100) NOT NULL,
        month VARCHAR(7) NOT NULL,
        target_amount DECIMAL(15, 2) NOT NULL,
        color VARCHAR(20) DEFAULT 'blue',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_account_month (account, month)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ budgets 테이블 확인/생성 완료');
  } catch (error) {
    console.error('❌ 테이블 초기화 실패:', error);
  }
};

export default pool;