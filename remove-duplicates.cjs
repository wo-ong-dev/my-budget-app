const axios = require('axios');

const API_BASE = 'http://13.125.205.126/api';

async function fetchNovemberTransactions() {
  const response = await axios.get(`${API_BASE}/transactions`, {
    params: { from: '2025-11-01', to: '2025-11-30' }
  });
  return response.data.rows;
}

async function deleteTransaction(id) {
  await axios.delete(`${API_BASE}/transactions/${id}`);
}

function findDuplicates(transactions) {
  const groups = new Map();

  // 날짜, 타입, 금액, 계좌, 카테고리, 메모가 같은 것들을 그룹화
  transactions.forEach(tx => {
    const key = JSON.stringify({
      date: tx.date.split('T')[0],
      type: tx.type,
      amount: tx.amount,
      account: tx.account,
      category: tx.category,
      memo: tx.memo || ''
    });

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(tx);
  });

  // 2개 이상인 그룹만 필터링
  const duplicateGroups = [];
  groups.forEach((txs, key) => {
    if (txs.length > 1) {
      duplicateGroups.push(txs);
    }
  });

  return duplicateGroups;
}

async function main() {
  console.log('🔍 11월 거래 내역 조회 중...');
  const transactions = await fetchNovemberTransactions();
  console.log(`✅ 총 ${transactions.length}개의 거래 내역 조회됨\n`);

  console.log('🔍 중복 항목 찾는 중...');
  const duplicateGroups = findDuplicates(transactions);
  console.log(`✅ ${duplicateGroups.length}개의 중복 그룹 발견\n`);

  if (duplicateGroups.length === 0) {
    console.log('중복 항목이 없습니다.');
    return;
  }

  let totalDeleted = 0;

  for (const group of duplicateGroups) {
    // 가장 오래된 것(가장 작은 ID)을 남기고 나머지 삭제
    const sorted = group.sort((a, b) => a.id - b.id);
    const keep = sorted[0];
    const toDelete = sorted.slice(1);

    console.log(`\n📌 [${keep.date.split('T')[0]}] ${keep.memo} - ${keep.amount.toLocaleString()}원`);
    console.log(`   계좌: ${keep.account}, 카테고리: ${keep.category}`);
    console.log(`   ✅ 유지: ID ${keep.id} (created: ${keep.created_at})`);

    for (const tx of toDelete) {
      try {
        await deleteTransaction(tx.id);
        console.log(`   ❌ 삭제: ID ${tx.id} (created: ${tx.created_at})`);
        totalDeleted++;
      } catch (error) {
        console.error(`   ⚠️  삭제 실패: ID ${tx.id}`, error.message);
      }
    }
  }

  console.log(`\n🎉 완료! 총 ${totalDeleted}개의 중복 항목 삭제됨`);
}

main().catch(console.error);
