const mysql = require('mysql2/promise');

async function testConnection() {
  const configs = [
    {
      host: 'bugetdb.cluw4caycgj9.ap-northeast-2.rds.amazonaws.com',
      port: 3306,
      user: 'wo_ong',
      password: '030256dnd!',
      database: 'my_budget'
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`\n🔍 시도 ${i + 1}: 비밀번호 "${config.password}"`);
    
    try {
      const connection = await mysql.createConnection(config);
      console.log('✅ 데이터베이스 연결 성공!');
      
      // 테이블 목록 확인
      const [tables] = await connection.execute('SHOW TABLES');
      console.log('📋 기존 테이블:', tables);
      
      await connection.end();
      return config;
    } catch (error) {
      console.log('❌ 연결 실패:', error.message);
    }
  }
  
  console.log('\n❌ 모든 비밀번호로 연결에 실패했습니다.');
  return null;
}

testConnection().then(result => {
  if (result) {
    console.log('\n🎉 성공한 설정:');
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit(0);
}).catch(error => {
  console.error('테스트 중 오류:', error);
  process.exit(1);
});
