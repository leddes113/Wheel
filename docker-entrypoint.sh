#!/bin/sh

# Docker entrypoint script
# Инициализирует данные и запускает приложение

set -e

echo "=== Vibe Wheel Docker Entrypoint ==="

# Проверяем наличие файлов данных и создаём из templates если нужно
if [ ! -f /app/data/topics_easy.json ]; then
    echo "Initializing topics_easy.json from template..."
    cp /app/data/topics_easy.json.template /app/data/topics_easy.json
fi

if [ ! -f /app/data/topics_hard.json ]; then
    echo "Initializing topics_hard.json from template..."
    cp /app/data/topics_hard.json.template /app/data/topics_hard.json
fi

if [ ! -f /app/data/state.json ]; then
    echo "Initializing empty state.json..."
    echo '{"users":[],"assignments":[],"usedTopics":{"easy":[],"hard":[]},"submissions":[]}' > /app/data/state.json
fi

echo "Data files ready."
echo "Starting application..."

# Запускаем приложение
exec "$@"
