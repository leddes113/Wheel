#!/bin/bash

# Скрипт для создания резервной копии данных приложения

set -e

# Настройки
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATA_DIR="${DATA_DIR:-./data}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="vibe-wheel-backup-${TIMESTAMP}.tar.gz"

echo "=== Vibe Wheel Backup Script ==="
echo "Starting backup at $(date)"

# Создаём директорию для бэкапов если её нет
mkdir -p "$BACKUP_DIR"

# Создаём архив с данными
echo "Creating backup archive: $BACKUP_NAME"
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" -C "$(dirname "$DATA_DIR")" "$(basename "$DATA_DIR")"

# Проверяем что архив создан
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
    echo "✓ Backup created successfully: ${BACKUP_DIR}/${BACKUP_NAME} (${BACKUP_SIZE})"
else
    echo "✗ Backup failed!"
    exit 1
fi

# Удаляем старые бэкапы (старше RETENTION_DAYS дней)
echo "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "vibe-wheel-backup-*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Показываем список всех бэкапов
echo ""
echo "Available backups:"
ls -lh "$BACKUP_DIR"/vibe-wheel-backup-*.tar.gz 2>/dev/null || echo "No backups found"

echo ""
echo "Backup completed at $(date)"
