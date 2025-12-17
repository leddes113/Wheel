#!/bin/bash

# Скрипт для проверки работоспособности приложения
# Можно использовать для мониторинга через cron или внешние системы

set -e

HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"
URL="http://${HOST}:${PORT}/api/health"
TIMEOUT="${TIMEOUT:-10}"

echo "Checking health: ${URL}"

# Выполняем запрос
response=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${TIMEOUT} ${URL} || echo "000")

# Проверяем статус код
if [ "$response" = "200" ]; then
    echo "✓ Application is healthy (HTTP ${response})"
    
    # Получаем детали
    details=$(curl -s --max-time ${TIMEOUT} ${URL})
    echo "Details: ${details}"
    
    exit 0
elif [ "$response" = "000" ]; then
    echo "✗ Application is unreachable (connection failed)"
    exit 1
else
    echo "✗ Application is unhealthy (HTTP ${response})"
    exit 1
fi
