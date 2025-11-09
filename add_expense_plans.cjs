const http = require('http');

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

async function addPlan(plan) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      account: plan.account,
      month: '2025-11',
      name: plan.name,
      amount: plan.amount,
      due_day: plan.day
    });

    const options = {
      hostname: '13.125.205.126',
      port: 3000,
      path: '/api/expense-plans',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✓ ${plan.name} (${plan.amount.toLocaleString()}원) - ${plan.account} ${plan.day}일`);
          resolve();
        } else {
          console.error(`✗ ${plan.name} 실패: ${res.statusCode} ${body}`);
          reject(new Error(`Failed: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error(`✗ ${plan.name} 에러:`, error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('지출 계획 추가 시작...\n');

  for (const plan of plans) {
    try {
      await addPlan(plan);
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    } catch (error) {
      console.error('중단됨:', error.message);
      break;
    }
  }

  console.log('\n완료!');
}

main();
