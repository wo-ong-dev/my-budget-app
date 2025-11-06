# 🔧 프로젝트 설정 가이드

## 📦 Claude Code 웹에서 작업하기

### 간단 요약
Claude Code 웹에서는 `.env` 파일 없이 작업 가능합니다!
- 코드 수정만 하면 됩니다
- git push 시 GitHub Actions가 자동으로 빌드/배포
- 환경 변수는 GitHub Secrets로 관리됨

### 작업 프로세스
1. https://claude.ai/code 접속
2. GitHub 저장소 `wo-ong-dev/my-budget-app` 연결
3. Claude에게 작업 요청 (예: "버그 수정해줘", "UI 개선해줘")
4. Claude가 자동으로 코드 수정 및 GitHub push
5. 2~3분 후 http://13.125.205.126 에서 자동 반영 확인

**장점:**
- ✅ 어느 PC에서든 브라우저만 있으면 작업 가능
- ✅ 환경 설정 불필요
- ✅ 자동 배포

**제한사항:**
- ❌ 로컬 테스트 불가 (배포 후 확인만 가능)
- ❌ 스크린샷 첨부 불가

---

## 💻 로컬 PC에서 작업하기 (VS Code + Claude Code IDE)

### 장점
- ✅ 로컬 테스트 가능 (`npm run dev`)
- ✅ 스크린샷 첨부 가능 (UI 피드백)
- ✅ 더 빠른 개발 속도

### 초기 설정 (한 번만)

#### 1) 저장소 클론
```bash
git clone https://github.com/wo-ong-dev/my-budget-app.git
cd my-budget-app
```

#### 2) 환경 변수 설정

**프론트엔드 (.env):**
```bash
# .env.example을 복사
cp .env.example .env

# 내용 (이미 예시대로 되어있음):
VITE_API_BASE_URL=http://13.125.205.126/api
```

**백엔드 (backend/.env) - 선택사항:**
```bash
cd backend
cp env.example .env

# 실제 값으로 수정:
DB_HOST=bugetdb.cluw4caycgj9.ap-northeast-2.rds.amazonaws.com
DB_PORT=3306
DB_USER=wo_ong
DB_PASSWORD=030256dnd!
DB_NAME=my_budget
PORT=8080
NODE_ENV=development
CORS_ORIGIN=*
```

> **참고:** 백엔드를 로컬에서 실행하지 않으면 이 파일은 필요 없습니다.
> 프론트엔드만 실행하고 배포된 API(`http://13.125.205.126/api`)를 사용할 수 있습니다.

#### 3) 의존성 설치
```bash
npm install
```

#### 4) 개발 서버 실행
```bash
# 프론트엔드만 (배포된 API 사용)
npm run dev
# → http://localhost:5173 접속

# 백엔드도 함께 실행하려면 (선택)
cd backend
npm install
npm run dev  # 포트 8080
```

### 작업 후 동기화
```bash
git add .
git commit -m "작업 내용"
git push origin main
# → GitHub Actions가 자동 배포
```

---

## 🔐 GitHub Secrets 설정 (관리자용)

> **주의:** 이 설정은 이미 완료되어 있을 가능성이 높습니다.
> 새로운 환경 변수를 추가하거나 변경할 때만 필요합니다.

### 현재 필요한 Secrets

**배포용:**
- `HOST`: 13.125.205.126
- `USER`: ec2-user
- `PORT`: 22
- `KEY`: [EC2 SSH 개인키 전체 내용]
- `APP_DIR`: /var/www/html

**빌드용:**
- `VITE_API_BASE_URL`: http://13.125.205.126/api

### 설정 방법
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name과 Value 입력 후 저장

---

## 🎯 권장 작업 방식

### UI/디자인 작업 (스크린샷 필요)
→ **로컬 PC (VS Code + Claude Code IDE)** 사용

### 코드 수정/버그 수정 (텍스트만)
→ **Claude Code 웹** 또는 **로컬** 둘 다 가능

### 외출 중 긴급 수정
→ **Claude Code 웹** (모바일 브라우저도 가능)

---

## ❓ FAQ

**Q: .env 파일을 Git에 올려야 하나요?**
A: 아니요! 보안상 절대 안됩니다. GitHub Secrets를 사용하세요.

**Q: 다른 PC에서 .env 파일은 어떻게 받나요?**
A: 수동으로 설정하거나, 안전한 방법으로 공유하세요 (1Password, 메모장 등).
   또는 배포된 API만 사용하면 프론트엔드 .env만 있으면 됩니다.

**Q: Claude Code 웹에서 로컬 테스트는 불가능한가요?**
A: 네, Claude Code 웹은 코드 수정 후 GitHub push만 합니다.
   테스트는 배포 후 실제 서버에서 확인해야 합니다.

**Q: 배포 시간을 더 줄일 수 없나요?**
A: 긴급한 경우 로컬에서 `deploy.bat`을 사용하면 30초 안에 배포됩니다.
   단, 이후 반드시 git commit/push로 동기화해야 합니다.
