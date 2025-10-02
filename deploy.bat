@echo off
REM Windows용 EC2 배포 스크립트
REM 사용법: deploy.bat [EC2_IP] [EC2_USER]

set EC2_IP=%1
set EC2_USER=%2

if "%EC2_IP%"=="" (
    echo 사용법: deploy.bat [EC2_IP] [EC2_USER]
    echo 예시: deploy.bat 3.34.123.456 ec2-user
    exit /b 1
)

if "%EC2_USER%"=="" (
    echo 사용법: deploy.bat [EC2_IP] [EC2_USER]
    echo 예시: deploy.bat 3.34.123.456 ec2-user
    exit /b 1
)

echo 🚀 EC2에 React 앱 배포 시작...

REM 1. 빌드 파일을 EC2로 업로드
echo 📦 빌드 파일 업로드 중...
scp -r dist\* %EC2_USER%@%EC2_IP%:/tmp/react-app/

REM 2. EC2에서 Nginx 설정
echo ⚙️ Nginx 설정 중...
ssh %EC2_USER%@%EC2_IP% "sudo yum update -y && sudo yum install nginx -y && sudo mkdir -p /var/www/html && sudo chown -R nginx:nginx /var/www/html && sudo cp -r /tmp/react-app/* /var/www/html/ && sudo systemctl start nginx && sudo systemctl enable nginx && sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload"

echo 🎉 배포가 완료되었습니다!
echo 🌐 http://%EC2_IP% 에서 앱을 확인해보세요.









