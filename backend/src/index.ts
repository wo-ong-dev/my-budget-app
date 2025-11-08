import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, initializeTables } from './config/database';
import transactionRoutes from './routes/transactions';
import summaryRoutes from './routes/summary';
import budgetRoutes from './routes/budgets';
import accountRoutes from './routes/accounts';
import categoryRoutes from './routes/categories';
import expensePlanRoutes from './routes/expensePlans';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001");

// 미들웨어 설정
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 라우트 설정
app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/expense-plans', expensePlanRoutes);

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: '서버가 정상적으로 실행 중입니다.',
    timestamp: new Date().toISOString()
  });
});

// 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({
    message: '내 가계부 API 서버',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      transactions: '/api/transactions',
      summary: '/api/summary',
      budgets: '/api/budgets',
      accounts: '/api/accounts',
      categories: '/api/categories'
    }
  });
});

// 404 핸들러
app.use( (req, res) => {
  res.status(404).json({
    ok: false,
    error: '요청한 엔드포인트를 찾을 수 없습니다.'
  });
});

// 에러 핸들러
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('서버 오류:', error);
  res.status(500).json({
    ok: false,
    error: '서버 내부 오류가 발생했습니다.'
  });
});

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ 데이터베이스 연결에 실패했습니다. 서버를 시작할 수 없습니다.');
      process.exit(1);
    }

    // 테이블 초기화
    await initializeTables();

    // 서버 시작
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
      console.log(`📊 API 문서: http://localhost:${PORT}`);
      console.log(`🏥 헬스 체크: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

startServer();