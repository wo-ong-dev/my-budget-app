-- 리밸런싱 정산(세션)용 테이블
-- 서버는 initializeTables()에서 IF NOT EXISTS로도 생성하지만, 운영/문서화를 위해 마이그레이션 파일도 제공합니다.

CREATE TABLE IF NOT EXISTS rebalance_overrides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(100) NOT NULL,
  pattern_key VARCHAR(100) NOT NULL,
  expected_account VARCHAR(100) NOT NULL,
  confidence INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category_pattern (category, pattern_key)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

