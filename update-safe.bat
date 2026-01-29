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
echo   БЕЗОПАСНОЕ ОБНОВЛЕНИЕ Vibe Wheel
echo   (с сохранением данных пользователей)
echo   Server: %SERVER_IP%
echo ========================================
echo.

echo [1/9] Testing SSH connection...
ssh -i %SSH_KEY% -o StrictHostKeyChecking=no %SERVER_USER%@%SERVER_IP% "echo Connection OK" || (
    echo ERROR: Cannot connect to server
    exit /b 1
)
echo ✓ Connected

echo.
echo [2/9] Создание резервной копии данных...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "cd %PROJECT_DIR% && tar -czf ~/backup-data-$(date +%%Y%%m%%d-%%H%%M%%S).tar.gz data/"
echo ✓ Backup created

echo.
echo [3/9] Сохранение данных во временную папку...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "mkdir -p ~/vibe-wheel-data-temp && cp -r %PROJECT_DIR%/data/* ~/vibe-wheel-data-temp/"
echo ✓ Data saved

echo.
echo [4/9] Остановка контейнера...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "docker stop vibe-wheel-app 2>/dev/null || true && docker rm vibe-wheel-app 2>/dev/null || true"
echo ✓ Container stopped

echo.
echo [5/9] Обновление кода из репозитория...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "cd %PROJECT_DIR% && git fetch origin && git reset --hard origin/main"
echo ✓ Code updated

echo.
echo [6/9] Восстановление данных пользователей...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "cp -r ~/vibe-wheel-data-temp/* %PROJECT_DIR%/data/ && rm -rf ~/vibe-wheel-data-temp"
echo ✓ Data restored

echo.
echo [7/9] Building Docker image...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "cd %PROJECT_DIR% && docker build -t vibe-wheel:latest ."
echo ✓ Built

echo.
echo [8/9] Starting application...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "docker run -d --name vibe-wheel-app --restart always -p 127.0.0.1:%APP_PORT%:3000 --env-file %PROJECT_DIR%/.env -v %PROJECT_DIR%/data:/app/data:rw -v %PROJECT_DIR%/logs:/app/logs:rw vibe-wheel:latest"
echo ✓ Started

echo.
echo [9/9] Waiting for app to start...
timeout /t 10 /nobreak >nul

echo.
echo Checking health...
ssh -i %SSH_KEY% %SERVER_USER%@%SERVER_IP% "curl -f http://localhost:%APP_PORT%/api/health"

echo.
echo.
echo ========================================
echo   ОБНОВЛЕНИЕ ЗАВЕРШЕНО!
echo   Данные пользователей сохранены ✓
echo ========================================
echo.
echo App URL: http://%SERVER_IP%:%APP_PORT%
echo Admin:   http://%SERVER_IP%:%APP_PORT%/admin
echo.
echo Резервные копии на сервере: ~/backup-data-*.tar.gz
echo.
pause

