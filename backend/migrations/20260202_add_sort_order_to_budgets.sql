-- budgets 테이블에 sort_order 컬럼 추가 (드래그앤드롭 순서 저장용)
ALTER TABLE budgets ADD COLUMN sort_order INT DEFAULT 0 AFTER is_custom;

-- 기존 데이터에 기본 순서 부여 (id 순서대로)
UPDATE budgets SET sort_order = id WHERE sort_order = 0 OR sort_order IS NULL;
