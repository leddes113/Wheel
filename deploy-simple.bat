@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set SERVER_IP=95.174.92.161
set SERVER_USER=user1
set SSH_KEY=deploy-key
set PROJECT_DIR=/home/user1/vibe-wheel
set APP_PORT=3000

echo.
echo ========================================
echo   Deploying Vibe Wheel
echo   Server: %SERVER_IP%
echo ========================================
echo.

echo [1/8] Testing SSH connection...
ssh -i %SSH_KEY% -o StrictHostKeyChecking=no %SERVER_USER%@%SERVER_IP% "echo Connection OK" || (
    echo ERROR: Cannot connect to server
    exit /b 1
)
echo ✓ Connected

echo.
echo [2/8] Installing Docker...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "command -v docker > /dev/null || (curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker %SERVER_USER% && rm get-docker.sh)"
echo ✓ Docker ready

echo.
echo [3/8] Installing Docker Compose...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "command -v docker-compose > /dev/null || sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-Linux-x86_64' -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
echo ✓ Docker Compose ready

echo.
echo [4/8] Cleaning up old deployment...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "docker stop vibe-wheel-app 2>/dev/null || true && docker rm vibe-wheel-app 2>/dev/null || true && sudo rm -rf %PROJECT_DIR%"
echo ✓ Cleaned

echo.
echo [5/8] Cloning repository...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "git clone git@github.com:leddes113/Wheel.git %PROJECT_DIR%"
echo ✓ Cloned

echo.
echo [5.5/8] Fixing data directory permissions...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "sudo chown -R 1001:1001 %PROJECT_DIR%/data"
echo ✓ Permissions fixed

echo.
echo [6/8] Creating .env file...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "echo NODE_ENV=production > %PROJECT_DIR%/.env && echo PORT=%APP_PORT% >> %PROJECT_DIR%/.env && echo ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич >> %PROJECT_DIR%/.env && echo NEXT_TELEMETRY_DISABLED=1 >> %PROJECT_DIR%/.env"
echo ✓ Environment configured

echo.
echo [7/8] Building Docker image...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "cd %PROJECT_DIR% && docker build -t vibe-wheel:latest ."
echo ✓ Built

echo.
echo [8/8] Starting application...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "docker run -d --name vibe-wheel-app --restart always -p %APP_PORT%:3000 -e NODE_ENV=production -e ADMIN_ALLOWLIST='Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич' -v %PROJECT_DIR%/data:/app/data:rw -v %PROJECT_DIR%/logs:/app/logs:rw vibe-wheel:latest"
echo ✓ Started

echo.
echo Waiting for app to start...
timeout /t 10 /nobreak >nul

echo.
echo Checking health...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "curl -f http://localhost:%APP_PORT%/api/health"

echo.
echo.
echo ========================================
echo   DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo App URL: http://%SERVER_IP%:%APP_PORT%
echo Admin:   http://%SERVER_IP%:%APP_PORT%/admin
echo.
echo Check logs: ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "docker logs -f vibe-wheel-app"
echo.
pause
