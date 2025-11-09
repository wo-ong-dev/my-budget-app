require('dotenv').config();
const mysql = require('mysql2/promise');

const plans = [
  { name: '여행계 1', amount: 10000, account: '국민은행', day: 1 },
  { name: '무제휴비 5', amount: 50000, account: '국민은행', day: 1 },
  { name: '청년적금 70', amount: 700000, account: '국민은행', day: 4 },
  { name: '상남금 30', amount: 300000, account: '국민은행', day: 1 },
  { name: '운전자보험 1', amount: 10000, account: '국민은행', day: 10 },
  { name: '대출이자 18.5', amount: 185000, account: '국민은행', day: 10 },
  { name: '보험 14', amount: 140000, account: '국민은행', day: 10 },
  { name: '상조 4', amount: 40000, account: '국민은행', day: 10 },
  { name: '보컬레슨 15', amount: 150000, account: '국민은행', day: 1 },
  { name: '쿠팡와우 0.8', amount: 8000, account: '국민은행', day: 21 },
  { name: '인터넷 2', amount: 20000, account: '국민은행', day: 25 },
  { name: '월세 20', amount: 200000, account: '국민은행', day: 28 },
  { name: '수도/전기 5', amount: 50000, account: '국민은행', day: 1 },
  { name: '주택적약 25', amount: 250000, account: '국민은행', day: 30 },
  { name: '휴대폰 9', amount: 90000, account: '신용카드', day: 10 },
  { name: '가스비 10', amount: 100000, account: '신용카드', day: 26 },
  { name: '교통비 7', amount: 70000, account: '신용카드', day: 31 },
  { name: '생활비 40', amount: 400000, account: '토스뱅크', day: 1 },
  { name: '미용 5', amount: 50000, account: '토스뱅크', day: 1 },
  { name: '넷플릭스 .055', amount: 550, account: '카카오페이', day: 1 },
  { name: '비상금2 0', amount: 0, account: '카카오뱅크', day: 1 },
  { name: '데이트 60', amount: 600000, account: '우리은행', day: 1 }
];

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'my_budget_db'
  });

  console.log('데이터베이스 연결 성공!');
  console.log('지출 계획 추가 시작...\n');

  let count = 0;
  for (const plan of plans) {
    try {
      await connection.execute(
        'INSERT INTO expense_plans (account, month, name, amount, due_day, is_checked) VALUES (?, ?, ?, ?, ?, ?)',
        [plan.account, '2025-11', plan.name, plan.amount, plan.day, 0]
      );
      console.log(`✓ ${plan.name} (${plan.amount.toLocaleString()}원) - ${plan.account} ${plan.day}일`);
      count++;
    } catch (error) {
      console.error(`✗ ${plan.name} 실패:`, error.message);
    }
  }

  await connection.end();
  console.log(`\n완료! 총 ${count}개 항목 추가됨`);
}

main().catch(console.error);
