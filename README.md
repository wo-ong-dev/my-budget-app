my-budget-app

개요
- 프론트엔드: Vite + React (정적 호스팅)
- 배포: GitHub Actions → EC2(Nginx) 자동 배포
- API 베이스: /api (Nginx: /api → 127.0.0.1:8080)

필수 정보
- 서버: http://13.125.205.126
- 헬스체크: http://13.125.205.126/health
- API 예시: GET http://13.125.205.126/api/accounts
- RDS(MySQL):
  - HOST: bugetdb.cluw4caycgj9.ap-northeast-2.rds.amazonaws.com
  - PORT: 3306
  - SCHEMA: budgetdb
  - APP USER: wo_ong_app / [비밀번호는 .env 파일 참조]
  - MASTER: wo_ong / [비밀번호는 별도 관리]

새로운 PC에서 시작하기
1) 저장소 클론
```bash
git clone https://github.com/wo-ong-dev/my-budget-app.git
cd my-budget-app
```

2) 환경 변수 설정
```bash
# 프론트엔드 (.env)
cp .env.example .env
# VITE_API_BASE_URL을 실제 API 주소로 수정

# 백엔드 (backend/.env)
cd backend
cp env.example .env
# DB_HOST, DB_USER, DB_PASSWORD 등을 실제 값으로 수정
cd ..
```

3) 의존성 설치 및 실행
```bash
# 프론트엔드
npm ci
npm run dev  # http://localhost:5173

# 백엔드 (별도 터미널)
cd backend
npm install
npm run dev  # http://localhost:8080
```

로컬 실행(원격 API 사용)
- 백엔드 없이 배포된 API 사용:
```bash
# .env 파일에 설정
VITE_API_BASE_URL=http://13.125.205.126/api

npm run dev
```

CI/CD (자동 배포)
- main 브랜치 푸시 시 자동으로 빌드 후 EC2 `/var/www/html`에 반영
- 시크릿(이미 사용 중): `HOST`, `USER`, `KEY`, `PORT`, `APP_DIR`
- 추가 시크릿: `VITE_API_BASE_URL = http://13.125.205.126/api`
- 수동 실행: GitHub → Actions → Build and Deploy (EC2 Nginx) → Run workflow

확인 방법
- 서버 헬스: `curl http://13.125.205.126/health`
- 정적 배포 확인: 브라우저로 `http://13.125.205.126`
- API 확인: `curl http://13.125.205.126/api/accounts`

DB 점검(읽기)
```bash
mysql -h bugetdb.cluw4caycgj9.ap-northeast-2.rds.amazonaws.com -u wo_ong_app -p -P 3306 -D budgetdb
# pw: [.env 파일의 DB_PASSWORD 참조]
# 예시 쿼리
SELECT COUNT(*) FROM accounts; SELECT COUNT(*) FROM categories;
```

문제 발생 시
- API 5xx: EC2에서 PM2 프로세스 `my-budget-api`(8080) 정상 동작 확인
- /api 404: Nginx 라우팅(`/api → 127.0.0.1:8080`) 확인
- 빌드 실패: Actions 로그에서 `npm ci`/`npm run build` 단계 확인
