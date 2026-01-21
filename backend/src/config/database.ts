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

    // rebalance_overrides: 사용자 피드백 기반(틀림/수정완료) 추천 보정 규칙
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS rebalance_overrides (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category VARCHAR(100) NOT NULL,
        pattern_key VARCHAR(100) NOT NULL,
        expected_account VARCHAR(100) NOT NULL,
        confidence INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_category_pattern (category, pattern_key)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ rebalance_overrides 테이블 확인/생성 완료');

    // rebalance_feedback: 정산 세션에서의 사용자 응답 로그 (완료/보류/틀림)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS rebalance_feedback (
        id INT PRIMARY KEY AUTO_INCREMENT,
        month VARCHAR(7) NOT NULL,
        transaction_id INT NOT NULL,
        original_account VARCHAR(100) NULL,
        category VARCHAR(100) NULL,
        memo VARCHAR(255) NULL,
        suggested_account VARCHAR(100) NULL,
        decision ENUM('APPLY','DEFER','WRONG') NOT NULL,
        corrected_account VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_month (month),
        KEY idx_transaction_id (transaction_id)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ rebalance_feedback 테이블 확인/생성 완료');
  } catch (error) {
    console.error('❌ 테이블 초기화 실패:', error);
  }
};

export default pool;