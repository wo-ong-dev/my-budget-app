-- 2026년 2월에 잘못 생성된 예산 삭제
-- 프론트엔드에서 잘못 복사된 데이터 정리
-- 백엔드가 자동으로 전월 데이터를 가져오므로 2월 커스텀 데이터는 불필요

-- 2026년 2월 예산 데이터 삭제
DELETE FROM budgets WHERE month = '2026-02';

-- 1월 데이터가 없으면 추가 (우리은행 60만, 카카오뱅크 1원, 카카오페이 22만, 토스뱅크 45만, 국민은행 211.3만)
INSERT INTO budgets (account, month, target_amount, color, is_custom)
SELECT '우리은행', '2026-01', 600000, 'blue', TRUE
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE account = '우리은행' AND month = '2026-01');

INSERT INTO budgets (account, month, target_amount, color, is_custom)
SELECT '카카오뱅크', '2026-01', 1, 'yellow', TRUE
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE account = '카카오뱅크' AND month = '2026-01');

INSERT INTO budgets (account, month, target_amount, color, is_custom)
SELECT '카카오페이', '2026-01', 220000, 'yellow', TRUE
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE account = '카카오페이' AND month = '2026-01');

INSERT INTO budgets (account, month, target_amount, color, is_custom)
SELECT '토스뱅크', '2026-01', 450000, 'blue', TRUE
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE account = '토스뱅크' AND month = '2026-01');

INSERT INTO budgets (account, month, target_amount, color, is_custom)
SELECT '국민은행', '2026-01', 2113000, 'yellow', TRUE
WHERE NOT EXISTS (SELECT 1 FROM budgets WHERE account = '국민은행' AND month = '2026-01');
