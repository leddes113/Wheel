$SERVER = "user1@vibe-wheel.ru"
$DIR = "/home/user1/vibe-wheel"

Write-Host "===Deploy to Production===" -ForegroundColor Cyan

Write-Host "1. Creating backup..." -ForegroundColor Yellow
$TS = Get-Date -Format "yyyyMMdd-HHmmss"
ssh $SERVER "cd $DIR; sudo cp data/state.json data/state.json.backup-$TS"

Write-Host "2. Updating code..." -ForegroundColor Yellow
ssh $SERVER "cd $DIR; git fetch origin"
ssh $SERVER "cd $DIR; git checkout origin/main -- . ':!data/state.json'"

Write-Host "3. Current commit:" -ForegroundColor Yellow
ssh $SERVER "cd $DIR; git log -1 --oneline"

Write-Host "4. Installing dependencies..." -ForegroundColor Yellow
ssh $SERVER "cd $DIR; npm install"

Write-Host "5. Building Docker image..." -ForegroundColor Yellow
ssh $SERVER "cd $DIR; sudo docker build -t vibe-wheel:latest ."

Write-Host "6. Stopping old container..." -ForegroundColor Yellow
ssh $SERVER "sudo docker stop vibe-wheel; sudo docker rm vibe-wheel"

Write-Host "7. Fixing permissions..." -ForegroundColor Yellow
ssh $SERVER "sudo chown -R 1001:1001 $DIR/data"

Write-Host "8. Starting new container..." -ForegroundColor Yellow
ssh $SERVER "sudo docker run -d --name vibe-wheel --restart unless-stopped -p 3000:3000 -v $DIR/data:/app/data --env-file $DIR/.env vibe-wheel:latest"

Write-Host "9. Waiting 10 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "10. Checking container..." -ForegroundColor Yellow
ssh $SERVER "sudo docker ps | grep vibe-wheel"

Write-Host "11. Checking logs..." -ForegroundColor Yellow
ssh $SERVER "sudo docker logs --tail 20 vibe-wheel"

Write-Host ""
Write-Host "===Deploy Complete!==="  -ForegroundColor Green
Write-Host "Check: https://vibe-wheel.ru/admin" -ForegroundColor Cyan
