-- budgets 테이블에 is_custom 컬럼 추가
ALTER TABLE budgets ADD COLUMN is_custom BOOLEAN DEFAULT FALSE AFTER color;

-- 기존 데이터는 모두 수정된 것으로 간주
UPDATE budgets SET is_custom = TRUE;
