# Деплой на продакшн с сохранением данных
$SERVER = "user1@vibe-wheel.ru"
$PROJECT_DIR = "/home/user1/vibe-wheel"

Write-Host "=== Деплой Vibe Wheel на продакшн ===" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка соединения
Write-Host "1. Проверка подключения к серверу..." -ForegroundColor Yellow
ssh $SERVER "echo 'SSH connected successfully'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка подключения к серверу!" -ForegroundColor Red
    exit 1
}

# 2. Backup data
Write-Host ""
Write-Host "2. Creating backup of state.json..." -ForegroundColor Yellow
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
ssh $SERVER "cd $PROJECT_DIR; sudo cp data/state.json data/state.json.backup-$TIMESTAMP"
Write-Host "   Backup created: state.json.backup-$TIMESTAMP" -ForegroundColor Green

# 3. Update code
Write-Host ""
Write-Host "3. Updating code from GitHub..." -ForegroundColor Yellow
ssh $SERVER "cd $PROJECT_DIR; git fetch origin; git checkout origin/main -- . ':!data/state.json'"
Write-Host "   Code updated (state.json preserved)" -ForegroundColor Green

# 4. Check commit
Write-Host ""
Write-Host "4. Current commit:" -ForegroundColor Yellow
ssh $SERVER "cd $PROJECT_DIR; git log -1 --oneline"

# 5. Install dependencies
Write-Host ""
Write-Host "5. Installing npm dependencies..." -ForegroundColor Yellow
ssh $SERVER "cd $PROJECT_DIR; npm install"

# 6. Rebuild Docker image
Write-Host ""
Write-Host "6. Rebuilding Docker image..." -ForegroundColor Yellow
ssh $SERVER "cd $PROJECT_DIR; sudo docker build --no-cache -t vibe-wheel:latest ."

# 7. Stop old container
Write-Host ""
Write-Host "7. Stopping old container..." -ForegroundColor Yellow
ssh $SERVER "sudo docker stop vibe-wheel 2>/dev/null `| true"
ssh $SERVER "sudo docker rm vibe-wheel 2>/dev/null `| true"
Write-Host "   Old container stopped" -ForegroundColor Green

# 8. Fix data permissions
Write-Host ""
Write-Host "8. Fixing data/ permissions..." -ForegroundColor Yellow
ssh $SERVER "sudo chown -R 1001:1001 $PROJECT_DIR/data"
Write-Host "   Permissions fixed" -ForegroundColor Green

# 9. Start new container
Write-Host ""
Write-Host "9. Starting new container..." -ForegroundColor Yellow
ssh $SERVER "sudo docker run -d --name vibe-wheel --restart unless-stopped -p 3000:3000 -v $PROJECT_DIR/data:/app/data --env-file $PROJECT_DIR/.env vibe-wheel:latest"
Write-Host "   Container started" -ForegroundColor Green

# 10. Wait for startup
Write-Host ""
Write-Host "10. Waiting for app to start (10 sec)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 11. Check status
Write-Host ""
Write-Host "11. Container status:" -ForegroundColor Yellow
ssh $SERVER "sudo docker ps | grep vibe-wheel"

# 12. Check logs
Write-Host ""
Write-Host "12. Recent logs:" -ForegroundColor Yellow
ssh $SERVER "sudo docker logs --tail 20 vibe-wheel"

# 13. Check health endpoint
Write-Host ""
Write-Host "13. API health check:" -ForegroundColor Yellow
ssh $SERVER "curl -s http://localhost:3000/api/health | head -5"

Write-Host ""
Write-Host "=== Deploy complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Open browser and check:" -ForegroundColor Cyan
Write-Host "  https://vibe-wheel.ru/admin" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Don't forget to upload Excel and create employees.json!" -ForegroundColor Yellow
Write-Host "Instructions in deploy-prod-manual.txt (section 13)" -ForegroundColor Yellow
