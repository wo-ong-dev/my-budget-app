require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function removeDuplicates() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 중복 항목 확인
    console.log('\n📊 중복 항목 확인 중...');
    const [duplicates] = await connection.query(`
      SELECT 
        date, type, amount, account, category, memo, COUNT(*) as cnt
      FROM transactions
      GROUP BY date, type, amount, account, category, memo
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 20
    `);

    if (duplicates.length === 0) {
      console.log('✅ 중복 항목이 없습니다.');
      return;
    }

    console.log(`⚠️  중복 항목 발견: ${duplicates.length}개 그룹`);
    console.log('상위 10개 예시:');
    duplicates.slice(0, 10).forEach((dup, idx) => {
      console.log(`  ${idx + 1}. ${dup.date} | ${dup.type} | ${dup.amount}원 | ${dup.account || '(없음)'} | ${dup.category || '(없음)'} | ${dup.memo || '(없음)'} | 중복 ${dup.cnt}개`);
    });

    // 2. 삭제 전 총 개수 확인
    const [beforeCount] = await connection.query('SELECT COUNT(*) as cnt FROM transactions');
    const beforeTotal = beforeCount[0].cnt;
    console.log(`\n📋 삭제 전 총 거래 내역: ${beforeTotal}개`);

    // 3. 중복 항목 삭제 (가장 작은 id만 유지)
    console.log('\n🗑️  중복 항목 삭제 중...');
    const [result] = await connection.query(`
      DELETE t1 FROM transactions t1
      INNER JOIN transactions t2
      WHERE t1.id > t2.id
        AND t1.date = t2.date
        AND t1.type = t2.type
        AND ABS(t1.amount - t2.amount) < 0.01
        AND (t1.account = t2.account OR (t1.account IS NULL AND t2.account IS NULL))
        AND (t1.category = t2.category OR (t1.category IS NULL AND t2.category IS NULL))
        AND (t1.memo = t2.memo OR (t1.memo IS NULL AND t2.memo IS NULL))
    `);

    const deletedCount = result.affectedRows;
    console.log(`✅ 삭제 완료: ${deletedCount}개 항목 삭제됨`);

    // 4. 삭제 후 총 개수 확인
    const [afterCount] = await connection.query('SELECT COUNT(*) as cnt FROM transactions');
    const afterTotal = afterCount[0].cnt;
    console.log(`📋 삭제 후 총 거래 내역: ${afterTotal}개`);
    console.log(`📉 감소량: ${beforeTotal - afterTotal}개`);

    // 5. 최종 중복 확인
    const [finalCheck] = await connection.query(`
      SELECT COUNT(*) as cnt
      FROM (
        SELECT date, type, amount, account, category, memo
        FROM transactions
        GROUP BY date, type, amount, account, category, memo
        HAVING COUNT(*) > 1
      ) as dup
    `);
    
    if (finalCheck[0].cnt === 0) {
      console.log('\n✅ 모든 중복 항목이 제거되었습니다!');
    } else {
      console.log(`\n⚠️  아직 ${finalCheck[0].cnt}개 그룹에 중복이 남아있습니다.`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

removeDuplicates()
  .then(() => {
    console.log('\n✅ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 작업 실패:', error);
    process.exit(1);
  });
