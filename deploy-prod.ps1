$SSH_KEY = "$HOME\.ssh\vibe-wheel-deploy"
$SERVER = "user1@vibe-wheel.ru"
$PROJECT_DIR = "/home/user1/vibe-wheel"

Write-Host "=== Deploy Vibe Wheel to Production ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ERROR: SSH key not found: $SSH_KEY" -ForegroundColor Red
    Write-Host "Run: ssh-keygen -t ed25519 -f `"$SSH_KEY`" -N ''" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Testing SSH connection..." -ForegroundColor Yellow
ssh -i $SSH_KEY -o ConnectTimeout=10 -o StrictHostKeyChecking=no $SERVER "echo SSH connected successfully"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect to server!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Add this public key to server:" -ForegroundColor Yellow
    Write-Host ""
    Get-Content "$SSH_KEY.pub"
    Write-Host ""
    Write-Host "Command on server:" -ForegroundColor Yellow
    Write-Host "mkdir -p ~/.ssh && echo '$(Get-Content "$SSH_KEY.pub")' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" -ForegroundColor White
    exit 1
}
Write-Host "Connected successfully" -ForegroundColor Green

Write-Host ""
Write-Host "2. Checking current state on server..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "ls -la $PROJECT_DIR/data/state.json 2>/dev/null || echo 'state.json not found'"

Write-Host ""
Write-Host "3. Creating backup of state.json..." -ForegroundColor Yellow
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$backupCmd = "cd $PROJECT_DIR; sudo cp data/state.json data/state.json.backup-$TIMESTAMP 2>/dev/null || echo 'Backup skipped, file not found'"
ssh -i $SSH_KEY $SERVER $backupCmd
Write-Host "Backup: state.json.backup-$TIMESTAMP" -ForegroundColor Green

Write-Host ""
Write-Host "4. Updating code from GitHub..." -ForegroundColor Yellow
$updateCmd = "cd $PROJECT_DIR; git fetch origin; git checkout origin/main -- . ':!data/state.json' ':!data/*.backup*'"
ssh -i $SSH_KEY $SERVER $updateCmd
Write-Host "Code updated, state.json preserved" -ForegroundColor Green

Write-Host ""
Write-Host "5. Current commit:" -ForegroundColor Yellow
$gitLogCmd = "cd $PROJECT_DIR; git log -1 --oneline"
ssh -i $SSH_KEY $SERVER $gitLogCmd

Write-Host ""
Write-Host "6. Installing npm dependencies..." -ForegroundColor Yellow
$npmCmd = "cd $PROJECT_DIR; npm install --production"
ssh -i $SSH_KEY $SERVER $npmCmd

Write-Host ""
Write-Host "7. Building Docker image..." -ForegroundColor Yellow
$dockerBuildCmd = "cd $PROJECT_DIR; sudo docker build --no-cache -t vibe-wheel:latest ."
ssh -i $SSH_KEY $SERVER $dockerBuildCmd

Write-Host ""
Write-Host "8. Stopping old container..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "sudo docker stop vibe-wheel 2>/dev/null || true"
ssh -i $SSH_KEY $SERVER "sudo docker rm vibe-wheel 2>/dev/null || true"
Write-Host "Old container stopped" -ForegroundColor Green

Write-Host ""
Write-Host "9. Fixing data permissions..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "sudo chown -R 1001:1001 $PROJECT_DIR/data"
Write-Host "Permissions fixed" -ForegroundColor Green

Write-Host ""
Write-Host "10. Starting new container..." -ForegroundColor Yellow
$dockerRunCmd = "sudo docker run -d --name vibe-wheel --restart unless-stopped -p 3000:3000 -v $PROJECT_DIR/data:/app/data --env-file $PROJECT_DIR/.env vibe-wheel:latest"
ssh -i $SSH_KEY $SERVER $dockerRunCmd
Write-Host "Container started" -ForegroundColor Green

Write-Host ""
Write-Host "11. Waiting for app to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "12. Container status:" -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "sudo docker ps | grep vibe-wheel"

Write-Host ""
Write-Host "13. Recent logs:" -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "sudo docker logs --tail 30 vibe-wheel"

Write-Host ""
Write-Host "14. Checking health endpoint..." -ForegroundColor Yellow
ssh -i $SSH_KEY $SERVER "curl -s http://localhost:3000/api/health"

Write-Host ""
Write-Host "=== Deploy Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Open in browser:" -ForegroundColor Cyan
Write-Host "  https://vibe-wheel.ru/" -ForegroundColor White
Write-Host "  https://vibe-wheel.ru/admin" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  ssh -i $SSH_KEY $SERVER 'sudo docker logs -f vibe-wheel'" -ForegroundColor White
Write-Host ""
