# PowerShell Deployment script for Vibe Wheel
# Target: 95.174.92.161 (vm-c0646c)

$ErrorActionPreference = "Stop"

$SERVER_IP = "95.174.92.161"
$SERVER_USER = "user1"
$SSH_KEY = "deploy-key"
$PROJECT_DIR = "/home/user1/vibe-wheel"
$REPO_URL = "git@github.com:leddes113/Wheel.git"
$APP_PORT = "3000"

Write-Host "🚀 Starting deployment to $SERVER_IP..." -ForegroundColor Green

# Function to run commands on remote server
function Run-Remote {
    param([string]$Command)
    ssh -i $SSH_KEY -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" $Command
}

Write-Host "📡 Checking server connection..." -ForegroundColor Cyan
try {
    Run-Remote "echo 'Connection successful'"
    Write-Host "✅ Connected to server" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to connect to server" -ForegroundColor Red
    exit 1
}

Write-Host "🐳 Checking Docker installation..." -ForegroundColor Cyan
$dockerInstalled = Run-Remote "command -v docker &> /dev/null && echo 'yes' || echo 'no'"
if ($dockerInstalled -notmatch "yes") {
    Write-Host "📦 Installing Docker..." -ForegroundColor Yellow
    Run-Remote @"
curl -fsSL https://get.docker.com -o get-docker.sh &&
sudo sh get-docker.sh &&
sudo usermod -aG docker $SERVER_USER &&
rm get-docker.sh
"@
    Write-Host "✅ Docker installed" -ForegroundColor Green
} else {
    Write-Host "✅ Docker already installed" -ForegroundColor Green
}

Write-Host "🐳 Checking Docker Compose installation..." -ForegroundColor Cyan
$composeInstalled = Run-Remote "command -v docker-compose &> /dev/null && echo 'yes' || echo 'no'"
if ($composeInstalled -notmatch "yes") {
    Write-Host "📦 Installing Docker Compose..." -ForegroundColor Yellow
    Run-Remote @"
sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-`$(uname -s)-`$(uname -m)' -o /usr/local/bin/docker-compose &&
sudo chmod +x /usr/local/bin/docker-compose
"@
    Write-Host "✅ Docker Compose installed" -ForegroundColor Green
} else {
    Write-Host "✅ Docker Compose already installed" -ForegroundColor Green
}

Write-Host "🗑️  Cleaning up old deployment..." -ForegroundColor Cyan
Run-Remote @"
if [ -d '$PROJECT_DIR' ]; then
    cd $PROJECT_DIR
    docker-compose down 2>/dev/null || true
    docker stop vibe-wheel-app 2>/dev/null || true
    docker rm vibe-wheel-app 2>/dev/null || true
    cd ..
    sudo rm -rf $PROJECT_DIR
fi
"@

Write-Host "📥 Cloning repository..." -ForegroundColor Cyan
Run-Remote "git clone $REPO_URL $PROJECT_DIR"

Write-Host "⚙️  Creating .env file..." -ForegroundColor Cyan
Run-Remote @"
cat > $PROJECT_DIR/.env << 'ENVEOF'
NODE_ENV=production
PORT=$APP_PORT
ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич
NEXT_TELEMETRY_DISABLED=1
ENVEOF
"@

Write-Host "🔨 Building Docker image..." -ForegroundColor Cyan
Run-Remote "cd $PROJECT_DIR && docker build -t vibe-wheel:latest ."

Write-Host "🚢 Starting application..." -ForegroundColor Cyan
Run-Remote @"
cd $PROJECT_DIR &&
docker run -d \
    --name vibe-wheel-app \
    --restart always \
    -p ${APP_PORT}:3000 \
    -e NODE_ENV=production \
    -e 'ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич' \
    -v ${PROJECT_DIR}/data:/app/data:rw \
    -v ${PROJECT_DIR}/logs:/app/logs:rw \
    vibe-wheel:latest
"@

Write-Host "⏳ Waiting for application to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "🏥 Checking health..." -ForegroundColor Cyan
$healthCheck = Run-Remote "curl -f http://localhost:${APP_PORT}/api/health 2>/dev/null"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Application is running at:" -ForegroundColor Cyan
    Write-Host "   http://${SERVER_IP}:${APP_PORT}" -ForegroundColor White
    Write-Host ""
    Write-Host "📊 Useful commands:" -ForegroundColor Cyan
    Write-Host "   Check logs:    ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_IP} 'docker logs -f vibe-wheel-app'" -ForegroundColor White
    Write-Host "   Restart:       ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_IP} 'docker restart vibe-wheel-app'" -ForegroundColor White
    Write-Host "   Stop:          ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_IP} 'docker stop vibe-wheel-app'" -ForegroundColor White
    Write-Host "   Admin panel:   http://${SERVER_IP}:${APP_PORT}/admin" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "⚠️  Application started but health check failed" -ForegroundColor Yellow
    Write-Host "Check logs: ssh -i $SSH_KEY ${SERVER_USER}@${SERVER_IP} 'docker logs vibe-wheel-app'" -ForegroundColor White
}

