-- 중복된 거래 내역 삭제 스크립트
-- 기준: 날짜, 구분, 금액, 계좌, 카테고리, 메모가 모두 동일한 경우

-- 1. 먼저 중복 항목 확인 (실행 전 확인용)
-- SELECT 
--   date, type, amount, account, category, memo, COUNT(*) as cnt
-- FROM transactions
-- GROUP BY date, type, amount, account, category, memo
-- HAVING COUNT(*) > 1
-- ORDER BY cnt DESC;

-- 2. 중복 항목 중 가장 오래된 것 하나만 남기고 나머지 삭제
-- (가장 작은 id를 가진 항목을 유지)
DELETE t1 FROM transactions t1
INNER JOIN transactions t2
WHERE t1.id > t2.id
  AND t1.date = t2.date
  AND t1.type = t2.type
  AND ABS(t1.amount - t2.amount) < 0.01
  AND (t1.account = t2.account OR (t1.account IS NULL AND t2.account IS NULL))
  AND (t1.category = t2.category OR (t1.category IS NULL AND t2.category IS NULL))
  AND (t1.memo = t2.memo OR (t1.memo IS NULL AND t2.memo IS NULL));

-- 3. 삭제 후 확인 (중복이 남아있는지 체크)
-- SELECT 
--   date, type, amount, account, category, memo, COUNT(*) as cnt
-- FROM transactions
-- GROUP BY date, type, amount, account, category, memo
-- HAVING COUNT(*) > 1;
