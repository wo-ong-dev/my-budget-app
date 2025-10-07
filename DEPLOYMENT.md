# 🚀 CI/CD + EC2 배포 가이드 (현재 운영 기준)

## 📋 **사전 준비사항**

### 1. **EC2 인스턴스 생성**
- **AMI**: Amazon Linux 2
- **인스턴스 타입**: t2.micro (프리티어)
- **보안 그룹**: HTTP (80), HTTPS (443), SSH (22) 포트 열기
- **키 페어**: 다운로드하여 안전한 곳에 보관

### 2. **로컬 환경 준비**
- **SSH 클라이언트**: Windows는 PuTTY 또는 WSL
- **SCP**: 파일 전송용

## 🛠️ **배포 방법(권장: GitHub Actions)**

### Workflow: `.github/workflows/deploy.yml`
트리거
- main 브랜치 푸시 또는 수동 `workflow_dispatch`

시크릿(이미 사용 중)
- `HOST` = 13.125.205.126
- `USER` = ec2-user (운영 계정 사용 시 그 값)
- `KEY` = EC2 SSH 프라이빗 키 전체 내용
- `PORT` = 22 (변경 시 해당 값)
- `APP_DIR` = /var/www/html (변경 시 해당 경로)
- 추가: `VITE_API_BASE_URL` = `http://13.125.205.126/api`

동작
1) `npm ci` → `npm run build`
2) `dist/*`를 EC2 `/tmp/my-budget-app`로 업로드(SCP)
3) `/var/www/html`(또는 `APP_DIR`)로 싱크 및 Nginx 재시작

수동 실행
- GitHub → Actions → Build and Deploy (EC2 Nginx) → Run workflow

### **대안: 수동 배포(비권장, 참고용)**

#### 1. **EC2에 접속**
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

#### 2. **Nginx 설치**
```bash
sudo yum update -y
sudo yum install nginx -y
```

#### 3. **파일 업로드**
```bash
# 로컬에서 실행
scp -i your-key.pem -r dist/* ec2-user@your-ec2-ip:/tmp/
```

#### 4. **EC2에서 파일 배치**
```bash
sudo mkdir -p /var/www/html
sudo cp -r /tmp/* /var/www/html/
sudo chown -R nginx:nginx /var/www/html
```

#### 5. **Nginx 설정**
```bash
sudo nano /etc/nginx/conf.d/react-app.conf
```

다음 내용 추가(예):
```nginx
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### 6. **서비스 시작**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## 🌐 **확인 및 접속**

배포 완료 후 다음 URL로 접속:
```
http://your-ec2-ip
```

## 🔧 **추가 설정 (선택사항)**

### **HTTPS 설정 (Let's Encrypt)**
```bash
# Certbot 설치
sudo yum install certbot python3-certbot-nginx -y

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo crontab -e
# 다음 줄 추가: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **도메인 연결**
1. **Route 53**에서 도메인 구매/설정
2. **A 레코드**로 EC2 IP 연결
3. **HTTPS 설정** 적용

## 🐛 **문제 해결**

### **Nginx가 시작되지 않는 경우**
```bash
sudo nginx -t  # 설정 파일 문법 확인
sudo systemctl status nginx  # 상태 확인
sudo journalctl -u nginx  # 로그 확인
```

### **파일 권한 문제**
```bash
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html
```

### **방화벽 문제**
```bash
sudo firewall-cmd --list-all  # 현재 설정 확인
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload
```

## 📊 **모니터링**

### **서비스 상태 확인**
```bash
sudo systemctl status nginx
sudo systemctl status sshd
```

### **로그 확인**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 💰 **비용 관리**

- **EC2 t2.micro**: 12개월 무료 (월 750시간)
- **RDS db.t3.micro**: 12개월 무료 (월 750시간)
- **데이터 전송**: 월 1GB 무료
- **스토리지**: 30GB EBS 무료

## 🔄 **업데이트 배포**

코드 변경 후 재배포(수동 방식일 때):
```bash
# 1. 로컬에서 빌드
npm run build

# 2. 배포 스크립트 재실행
./deploy.sh [EC2_IP] [EC2_USER]
```

---

**문제가 있으면 AWS 콘솔의 EC2 인스턴스 상태를 확인하고, 로그를 살펴보세요!** 🚀









