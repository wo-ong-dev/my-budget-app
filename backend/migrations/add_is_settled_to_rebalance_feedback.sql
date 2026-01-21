-- rebalance_feedback 테이블에 is_settled 컬럼 추가
-- 리밸런싱 완료(APPLY)한 항목 중에서 실제 계좌 이체까지 완료했는지 여부

ALTER TABLE rebalance_feedback
ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT FALSE AFTER decision;

-- 인덱스 추가 (정산제안 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_is_settled ON rebalance_feedback(decision, is_settled, month);
