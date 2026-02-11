#!/bin/bash
set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

DOMAIN="vibe-wheel.ru"
EMAIL="dibrow.dmitrij@yandex.ru"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Setup for Vibe Wheel${NC}"
echo -e "${GREEN}  Domain: $DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. Проверка, что Docker приложение работает
echo -e "${YELLOW}[1/7] Checking Docker application...${NC}"
if ! docker ps | grep -q vibe-wheel-app; then
    echo -e "${RED}ERROR: vibe-wheel-app is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker app is running${NC}"
echo ""

# 2. Установка Nginx
echo -e "${YELLOW}[2/7] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y nginx
fi
echo -e "${GREEN}✓ Nginx installed${NC}"
echo ""

# 3. Установка Certbot
echo -e "${YELLOW}[3/7] Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt-get install -y certbot python3-certbot-nginx
fi
echo -e "${GREEN}✓ Certbot installed${NC}"
echo ""

# 4. Остановка Nginx (если запущен)
echo -e "${YELLOW}[4/7] Stopping Nginx...${NC}"
sudo systemctl stop nginx 2>/dev/null || true
echo -e "${GREEN}✓ Nginx stopped${NC}"
echo ""

# 5. Получение SSL сертификата
echo -e "${YELLOW}[5/7] Obtaining SSL certificate...${NC}"
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --preferred-challenges http

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Failed to obtain SSL certificate${NC}"
    echo -e "${YELLOW}Please check:${NC}"
    echo -e "  1. Domain DNS is properly configured"
    echo -e "  2. Port 80 is open and accessible"
    echo -e "  3. No other services are using port 80"
    exit 1
fi
echo -e "${GREEN}✓ SSL certificate obtained${NC}"
echo ""

# 6. Копирование конфигурации Nginx
echo -e "${YELLOW}[6/7] Configuring Nginx...${NC}"
sudo mkdir -p /var/www/certbot
sudo cp /home/user1/vibe-wheel/nginx/nginx.conf /etc/nginx/nginx.conf
echo -e "${GREEN}✓ Nginx configured${NC}"
echo ""

# 7. Запуск Nginx
echo -e "${YELLOW}[7/7] Starting Nginx...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx
echo -e "${GREEN}✓ Nginx started and enabled${NC}"
echo ""

# Настройка автообновления сертификата
echo -e "${YELLOW}Setting up certificate auto-renewal...${NC}"
sudo systemctl enable certbot.timer 2>/dev/null || true
echo -e "${GREEN}✓ Auto-renewal configured${NC}"
echo ""

# Проверка конфигурации
echo -e "${YELLOW}Testing configuration...${NC}"
if ! sudo nginx -t; then
    echo -e "${RED}ERROR: Nginx configuration test failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Configuration valid${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL SETUP COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Your site is now available at:${NC}"
echo -e "  https://$DOMAIN"
echo -e "  https://www.$DOMAIN/admin (admin panel)"
echo ""
echo -e "${YELLOW}Certificate will be automatically renewed before expiration.${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  Check Nginx status:    sudo systemctl status nginx"
echo -e "  Reload Nginx:          sudo systemctl reload nginx"
echo -e "  Check certificate:     sudo certbot certificates"
echo -e "  Renew certificate:     sudo certbot renew --dry-run"
echo ""
