#!/bin/bash

# Скрипт для безопасного обновления приложения
# Автоматически создаёт бэкап, обновляет код и перезапускает приложение

set -e

echo "=== Vibe Wheel Update Script ==="
echo "Starting update at $(date)"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: This script must be run from the vibe-wheel root directory${NC}"
    exit 1
fi

# Шаг 1: Создание бэкапа
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
if [ -x "./scripts/backup.sh" ]; then
    ./scripts/backup.sh
    echo -e "${GREEN}✓ Backup created${NC}"
else
    echo -e "${RED}Warning: backup.sh not found or not executable${NC}"
    read -p "Continue without backup? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        echo "Update cancelled."
        exit 0
    fi
fi

echo ""

# Шаг 2: Сохранение текущей версии для rollback
echo -e "${YELLOW}Step 2: Saving current version...${NC}"
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Current commit: $CURRENT_COMMIT"
echo "$CURRENT_COMMIT" > .last-known-good-commit
echo -e "${GREEN}✓ Version saved${NC}"

echo ""

# Шаг 3: Получение обновлений
echo -e "${YELLOW}Step 3: Fetching updates...${NC}"
git fetch origin

# Показываем что изменится
echo "Changes to be applied:"
git log HEAD..origin/main --oneline --graph || echo "No changes or branch name different"

echo ""
read -p "Continue with update? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Update cancelled."
    exit 0
fi

# Применяем обновления
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"

echo ""

# Шаг 4: Пересборка Docker образа
echo -e "${YELLOW}Step 4: Rebuilding Docker image...${NC}"
docker-compose down
docker-compose build --no-cache
echo -e "${GREEN}✓ Image rebuilt${NC}"

echo ""

# Шаг 5: Запуск обновлённого приложения
echo -e "${YELLOW}Step 5: Starting updated application...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Application started${NC}"

# Ждём немного для запуска
echo "Waiting for application to start..."
sleep 10

echo ""

# Шаг 6: Проверка работоспособности
echo -e "${YELLOW}Step 6: Health check...${NC}"
MAX_ATTEMPTS=6
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
    
    if curl -sf http://localhost:3000/api/health > /dev/null; then
        echo -e "${GREEN}✓ Application is healthy!${NC}"
        HEALTHY=true
        break
    else
        echo "Not healthy yet, waiting..."
        sleep 5
        ATTEMPT=$((ATTEMPT + 1))
    fi
done

echo ""

# Проверяем результат
if [ "$HEALTHY" = "true" ]; then
    echo -e "${GREEN}=== Update completed successfully! ===${NC}"
    echo ""
    echo "New commit: $(git rev-parse HEAD)"
    echo "Previous commit saved to .last-known-good-commit"
    echo ""
    docker-compose logs --tail=20
    exit 0
else
    echo -e "${RED}=== Update failed! Application is not healthy ===${NC}"
    echo ""
    echo "Rolling back to previous version..."
    
    # Rollback
    git reset --hard "$CURRENT_COMMIT"
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    echo -e "${YELLOW}Rolled back to commit: $CURRENT_COMMIT${NC}"
    echo "Please check logs: docker-compose logs"
    
    exit 1
fi
