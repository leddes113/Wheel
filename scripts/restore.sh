#!/bin/bash

# Скрипт для восстановления данных из резервной копии

set -e

# Настройки
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATA_DIR="${DATA_DIR:-./data}"

echo "=== Vibe Wheel Restore Script ==="

# Проверяем наличие аргумента
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/vibe-wheel-backup-*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"

# Проверяем существование файла бэкапа
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Backup file: $BACKUP_FILE"
echo "Target directory: $DATA_DIR"
echo ""

# Подтверждение
read -p "This will overwrite current data. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Создаём бэкап текущих данных перед восстановлением
if [ -d "$DATA_DIR" ]; then
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    SAFETY_BACKUP="${BACKUP_DIR}/pre-restore-${TIMESTAMP}.tar.gz"
    echo "Creating safety backup of current data: $SAFETY_BACKUP"
    tar -czf "$SAFETY_BACKUP" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"
fi

# Восстанавливаем данные
echo "Restoring data..."
tar -xzf "$BACKUP_FILE" -C "$(dirname "$DATA_DIR")"

echo "✓ Data restored successfully from: $BACKUP_FILE"
echo ""
echo "Please restart the application for changes to take effect."
