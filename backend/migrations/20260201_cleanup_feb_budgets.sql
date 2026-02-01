-- 2026년 1월 예산 데이터 추가 (없는 것만)
-- 우리은행 60만, 카카오페이 22만, 토스뱅크 45만 추가

INSERT IGNORE INTO budgets (account, month, target_amount, color, is_custom)
VALUES ('우리은행', '2026-01', 600000, 'blue', TRUE);

INSERT IGNORE INTO budgets (account, month, target_amount, color, is_custom)
VALUES ('카카오페이', '2026-01', 220000, 'yellow', TRUE);

INSERT IGNORE INTO budgets (account, month, target_amount, color, is_custom)
VALUES ('토스뱅크', '2026-01', 450000, 'blue', TRUE);
