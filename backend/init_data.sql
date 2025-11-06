INSERT IGNORE INTO accounts (name, type, created_at, updated_at) VALUES
('국민은행', 'bank', NOW(), NOW()),
('토스뱅크', 'bank', NOW(), NOW()),
('우리은행', 'bank', NOW(), NOW()),
('신용카드', 'card', NOW(), NOW()),
('카카오페이', 'card', NOW(), NOW()),
('카카오뱅크', 'bank', NOW(), NOW()),
('현금', 'cash', NOW(), NOW());

INSERT IGNORE INTO categories (name, type, created_at, updated_at) VALUES
('급여', '수입', NOW(), NOW()),
('용돈', '수입', NOW(), NOW()),
('그 외', '수입', NOW(), NOW()),
('기타', '지출', NOW(), NOW()),
('교통비', '지출', NOW(), NOW()),
('구독/포인트', '지출', NOW(), NOW()),
('데이트', '지출', NOW(), NOW()),
('생활/마트', '지출', NOW(), NOW()),
('선물/경조사비', '지출', NOW(), NOW()),
('식비', '지출', NOW(), NOW()),
('여행/숙박', '지출', NOW(), NOW()),
('월세/관리비', '지출', NOW(), NOW()),
('저축/상조/보험', '지출', NOW(), NOW()),
('카페/음료', '지출', NOW(), NOW()),
('통신비/인터넷비', '지출', NOW(), NOW()),
('편의점', '지출', NOW(), NOW()),
('취미', '지출', NOW(), NOW()),
('상납금', '지출', NOW(), NOW());

SELECT 'Accounts:' as '';
SELECT * FROM accounts;
SELECT 'Categories:' as '';
SELECT * FROM categories;
