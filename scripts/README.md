# Скрипты для обслуживания

Эта директория содержит утилиты для обслуживания и управления приложением Vibe Wheel.

## 📁 Содержимое

### Резервное копирование

#### `backup.sh` (Linux/Mac)
Создаёт резервную копию данных приложения.

```bash
./scripts/backup.sh
```

**Параметры через переменные окружения:**
- `BACKUP_DIR` - директория для бэкапов (по умолчанию: `./backups`)
- `DATA_DIR` - директория с данными (по умолчанию: `./data`)
- `RETENTION_DAYS` - сколько дней хранить бэкапы (по умолчанию: 30)

**Пример:**
```bash
RETENTION_DAYS=60 ./scripts/backup.sh
```

#### `backup.ps1` (Windows)
То же самое для Windows.

```powershell
.\scripts\backup.ps1
```

**Параметры:**
```powershell
.\scripts\backup.ps1 -BackupDir ".\backups" -DataDir ".\data" -RetentionDays 30
```

---

### Восстановление

#### `restore.sh` (Linux/Mac)
Восстанавливает данные из резервной копии.

```bash
./scripts/restore.sh ./backups/vibe-wheel-backup-20250101_030000.tar.gz
```

**Безопасность:**
- Перед восстановлением создаётся safety backup текущих данных
- Требует подтверждение перед перезаписью

#### `restore.ps1` (Windows)
То же самое для Windows.

```powershell
.\scripts\restore.ps1 -BackupFile .\backups\vibe-wheel-backup-20250101_030000.zip
```

---

### Health Check

#### `healthcheck.sh` (Linux/Mac)
Проверяет работоспособность приложения.

```bash
./scripts/healthcheck.sh
```

**Параметры через переменные окружения:**
- `HOST` - хост для проверки (по умолчанию: localhost)
- `PORT` - порт приложения (по умолчанию: 3000)
- `TIMEOUT` - таймаут запроса в секундах (по умолчанию: 10)

**Exit codes:**
- `0` - приложение здорово
- `1` - приложение недоступно или нездорово

**Использование в мониторинге:**
```bash
# Добавьте в cron для проверки каждые 5 минут
*/5 * * * * /path/to/vibe-wheel/scripts/healthcheck.sh || echo "Alert: App is down" | mail -s "Vibe Wheel Down" admin@company.com
```

#### `healthcheck.ps1` (Windows)
То же самое для Windows.

```powershell
.\scripts\healthcheck.ps1 -Host "localhost" -Port 3000 -Timeout 10
```

---

### Обновление приложения

#### `update-app.sh` (Linux/Mac)
Безопасно обновляет приложение с автоматическим rollback при ошибках.

```bash
./scripts/update-app.sh
```

**Что делает:**
1. Создаёт бэкап данных
2. Сохраняет текущую версию для rollback
3. Получает обновления из git
4. Пересобирает Docker образ
5. Запускает обновлённое приложение
6. Проверяет health check
7. Откатывается назад если что-то пошло не так

**Интерактивный:** Запрашивает подтверждение перед применением обновлений.

#### `update-app.ps1` (Windows)
То же самое для Windows.

```powershell
.\scripts\update-app.ps1
```

**Пропустить создание бэкапа:**
```powershell
.\scripts\update-app.ps1 -SkipBackup
```

---

### Инициализация и проверка

#### `init-data.js`
Инициализирует данные при первом запуске. Создаёт пустой `state.json` если его нет.

```bash
node scripts/init-data.js
```

Автоматически запускается через npm hook: `npm run prestart`

#### `check-env.js`
Проверяет конфигурацию перед запуском приложения.

```bash
node scripts/check-env.js
```

**Проверяет:**
- Переменные окружения (ADMIN_ALLOWLIST и т.д.)
- Наличие необходимых файлов данных
- Права доступа на запись
- NODE_ENV

Автоматически запускается через npm hook: `npm run prebuild`

---

## 🔧 Установка и настройка

### Linux/Mac

Сделайте скрипты исполняемыми:

```bash
chmod +x scripts/*.sh
```

### Windows

PowerShell скрипты готовы к использованию. Если возникают проблемы с execution policy:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📅 Автоматизация

### Автоматическое резервное копирование

#### Linux/Mac (cron)

```bash
# Редактировать crontab
crontab -e

# Добавить строку для ежедневного бэкапа в 3:00
0 3 * * * cd /path/to/vibe-wheel && ./scripts/backup.sh >> ./logs/backup.log 2>&1
```

#### Windows (Task Scheduler)

1. Откройте Task Scheduler
2. Создайте новую задачу
3. Триггер: Ежедневно в 3:00
4. Действие: Запустить программу
   - Программа: `powershell.exe`
   - Аргументы: `-File C:\path\to\vibe-wheel\scripts\backup.ps1`
5. Сохраните задачу

### Автоматический мониторинг

#### Linux/Mac (cron)

```bash
# Проверка каждые 5 минут
*/5 * * * * cd /path/to/vibe-wheel && ./scripts/healthcheck.sh || echo "Alert" | mail -s "Vibe Wheel Down" admin@company.com
```

---

## 🛠️ Разработка

### Добавление новых скриптов

Если вы добавляете новые скрипты:

1. Создайте версию для Linux/Mac (.sh) и Windows (.ps1)
2. Добавьте описание в этот README
3. Сделайте .sh скрипты исполняемыми
4. Используйте `set -e` в bash скриптах для безопасности
5. Добавьте проверку ошибок и полезный вывод

### Шаблон bash скрипта

```bash
#!/bin/bash
set -e

echo "=== My Script ==="

# Проверки
if [ ! -f "important-file" ]; then
    echo "Error: important-file not found"
    exit 1
fi

# Основная логика
echo "Doing something..."
# ...

echo "✓ Done"
exit 0
```

### Шаблон PowerShell скрипта

```powershell
param(
    [string]$Parameter = "default"
)

$ErrorActionPreference = "Stop"

Write-Host "=== My Script ===" -ForegroundColor Cyan

# Проверки
if (-not (Test-Path "important-file")) {
    Write-Host "Error: important-file not found" -ForegroundColor Red
    exit 1
}

# Основная логика
Write-Host "Doing something..." -ForegroundColor Yellow
# ...

Write-Host "✓ Done" -ForegroundColor Green
exit 0
```

---

## 📖 Дополнительная документация

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Полное руководство по развертыванию
- [MAINTENANCE.md](../MAINTENANCE.md) - Руководство по обслуживанию
- [QUICK_START.md](../QUICK_START.md) - Быстрый старт

---

*Последнее обновление: 2025-12-17*






