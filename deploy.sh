#!/bin/bash

# EC2 배포 스크립트
# 사용법: ./deploy.sh [EC2_IP] [EC2_USER]

EC2_IP=$1
EC2_USER=$2

if [ -z "$EC2_IP" ] || [ -z "$EC2_USER" ]; then
    echo "사용법: ./deploy.sh [EC2_IP] [EC2_USER]"
    echo "예시: ./deploy.sh 3.34.123.456 ec2-user"
    exit 1
fi

echo "🚀 EC2에 React 앱 배포 시작..."

# 1. 빌드 파일을 EC2로 업로드
echo "📦 빌드 파일 업로드 중..."
scp -r dist/* $EC2_USER@$EC2_IP:/tmp/react-app/

# 2. EC2에서 Nginx 설정
echo "⚙️ Nginx 설정 중..."
ssh $EC2_USER@$EC2_IP << 'EOF'
# Nginx 설치 (Amazon Linux 2)
sudo yum update -y
sudo yum install nginx -y

# 웹 디렉토리 생성
sudo mkdir -p /var/www/html
sudo chown -R nginx:nginx /var/www/html

# React 앱 파일 복사
sudo cp -r /tmp/react-app/* /var/www/html/

# Nginx 설정 파일 생성
sudo tee /etc/nginx/conf.d/react-app.conf > /dev/null << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;
    
    # React Router를 위한 설정
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_EOF

# Nginx 시작 및 자동 시작 설정
sudo systemctl start nginx
sudo systemctl enable nginx

# 방화벽 설정 (HTTP 포트 열기)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

echo "✅ 배포 완료!"
echo "🌐 http://$EC2_IP 에서 앱을 확인할 수 있습니다."
EOF

echo "🎉 배포가 완료되었습니다!"
echo "🌐 http://$EC2_IP 에서 앱을 확인해보세요."









