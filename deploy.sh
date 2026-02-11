#!/bin/bash
set -e

# Deployment script for Vibe Wheel
# Target: 95.174.92.161 (vm-c0646c)

SERVER_IP="95.174.92.161"
SERVER_USER="user1"
SSH_KEY="deploy-key"
PROJECT_DIR="/home/user1/vibe-wheel"
REPO_URL="git@github.com:leddes113/Wheel.git"
APP_PORT="3000"

echo "🚀 Starting deployment to $SERVER_IP..."

# Ensure SSH key has correct permissions
chmod 600 "$SSH_KEY"

# Function to run commands on remote server
run_remote() {
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$@"
}

# Function to copy files to remote server
copy_to_remote() {
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$1" "$SERVER_USER@$SERVER_IP:$2"
}

echo "📡 Checking server connection..."
if ! run_remote "echo 'Connection successful'"; then
    echo "❌ Failed to connect to server"
    exit 1
fi

echo "✅ Connected to server"

echo "🐳 Checking Docker installation..."
if ! run_remote "command -v docker &> /dev/null"; then
    echo "📦 Installing Docker..."
    run_remote "
        curl -fsSL https://get.docker.com -o get-docker.sh &&
        sudo sh get-docker.sh &&
        sudo usermod -aG docker $SERVER_USER &&
        rm get-docker.sh
    "
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

echo "🐳 Checking Docker Compose installation..."
if ! run_remote "command -v docker-compose &> /dev/null && command -v docker compose &> /dev/null"; then
    echo "📦 Installing Docker Compose..."
    run_remote "
        sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose &&
        sudo chmod +x /usr/local/bin/docker-compose
    "
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

echo "🗑️  Cleaning up old deployment..."
run_remote "
    if [ -d \"$PROJECT_DIR\" ]; then
        cd $PROJECT_DIR
        docker-compose down 2>/dev/null || true
        docker stop vibe-wheel-app 2>/dev/null || true
        docker rm vibe-wheel-app 2>/dev/null || true
        cd ..
        sudo rm -rf $PROJECT_DIR
    fi
"

echo "📥 Cloning repository..."
run_remote "
    git clone $REPO_URL $PROJECT_DIR
"

echo "⚙️  Creating .env file..."
run_remote "cat > $PROJECT_DIR/.env << 'ENVEOF'
NODE_ENV=production
PORT=$APP_PORT
ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич
NEXT_TELEMETRY_DISABLED=1
ENVEOF"

echo "🔨 Building Docker image..."
run_remote "cd $PROJECT_DIR && docker build -t vibe-wheel:latest ."

echo "🚢 Starting application..."
run_remote "
    cd $PROJECT_DIR &&
    docker run -d \
        --name vibe-wheel-app \
        --restart always \
        -p $APP_PORT:3000 \
        -e NODE_ENV=production \
        -e ADMIN_ALLOWLIST='Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич' \
        -v $PROJECT_DIR/data:/app/data:rw \
        -v $PROJECT_DIR/logs:/app/logs:rw \
        vibe-wheel:latest
"

echo "⏳ Waiting for application to start..."
sleep 10

echo "🏥 Checking health..."
if run_remote "curl -f http://localhost:$APP_PORT/api/health"; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Application is running at:"
    echo "   http://$SERVER_IP:$APP_PORT"
    echo ""
    echo "📊 Useful commands:"
    echo "   Check logs:    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'docker logs -f vibe-wheel-app'"
    echo "   Restart:       ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'docker restart vibe-wheel-app'"
    echo "   Stop:          ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'docker stop vibe-wheel-app'"
    echo "   Admin panel:   http://$SERVER_IP:$APP_PORT/admin"
else
    echo ""
    echo "⚠️  Application started but health check failed"
    echo "Check logs: ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'docker logs vibe-wheel-app'"
fi

