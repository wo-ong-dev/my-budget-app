-- 월간 지출 계획 테이블 생성
CREATE TABLE IF NOT EXISTS expense_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account VARCHAR(100) NOT NULL,
  month VARCHAR(7) NOT NULL, -- yyyy-mm
  name VARCHAR(200) NOT NULL, -- 항목명 (예: "여행계 1 국민은행 1일")
  amount DECIMAL(15, 2) NOT NULL,
  due_day INT, -- 예정일 (1-31)
  is_checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_plan (account, month, name),
  INDEX idx_month (month),
  INDEX idx_account_month (account, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
