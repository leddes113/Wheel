# Quick Start Guide

Быстрый старт для развертывания Vibe Wheel приложения.

## 🚀 Самый простой способ (Docker)

### Шаг 1: Клонируйте репозиторий

```bash
git clone <repository-url>
cd vibe-wheel
```

### Шаг 2: Создайте .env файл

```bash
# Linux/Mac
cat > .env << 'EOF'
NODE_ENV=production
ADMIN_ALLOWLIST="Иван Иванов;Петр Петров"
EOF

# Windows (PowerShell)
@"
NODE_ENV=production
ADMIN_ALLOWLIST=Иван Иванов;Петр Петров
"@ | Out-File -FilePath .env -Encoding utf8
```

### Шаг 3: Запустите приложение

```bash
docker-compose up -d
```

### Шаг 4: Проверьте что всё работает

```bash
# Проверка статуса
docker-compose ps

# Health check
curl http://localhost:3000/api/health

# Откройте в браузере
# http://localhost:3000
```

**Готово! 🎉**

---

## 📦 Альтернатива: без Docker (Node.js)

### Требования

- Node.js 20.x или выше
- npm или yarn

### Шаги

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd vibe-wheel

# 2. Установите зависимости
npm install

# 3. Создайте .env файл
cp .env.example .env
# Отредактируйте .env и добавьте администраторов

# 4. Инициализируйте данные
npm run init-data

# 5. Соберите приложение
npm run build

# 6. Запустите
npm start

# Откройте http://localhost:3000
```

---

## 🔧 Основные команды

### Docker

```bash
# Запуск
docker-compose up -d

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Логи
docker-compose logs -f

# Обновление
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Node.js (без Docker)

```bash
# Dev режим
npm run dev

# Production
npm run build
npm start

# С PM2 (рекомендуется для production)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs
pm2 restart vibe-wheel
```

---

## 📊 Проверка работоспособности

```bash
# Health check
curl http://localhost:3000/api/health

# Ожидаемый ответ:
# {"status":"healthy","timestamp":"...","uptime":123,"version":"0.1.0"}
```

---

## 🔐 Настройка администраторов

В `.env` файле укажите список администраторов:

```env
ADMIN_ALLOWLIST="Иван Иванов;Петр Петров;Анна Сидорова"
```

**Важно:** 
- Разделитель - точка с запятой (`;`)
- ФИО должны точно совпадать с тем, что вводит пользователь
- После изменения перезапустите приложение

---

## 💾 Резервное копирование

### Создание бэкапа

```bash
# Linux/Mac
./scripts/backup.sh

# Windows
.\scripts\backup.ps1
```

### Восстановление

```bash
# Linux/Mac
./scripts/restore.sh ./backups/vibe-wheel-backup-YYYYMMDD_HHMMSS.tar.gz

# Windows
.\scripts\restore.ps1 -BackupFile .\backups\vibe-wheel-backup-YYYYMMDD_HHMMSS.zip
```

---

## 🆘 Troubleshooting

### Приложение не запускается

```bash
# Проверьте логи
docker-compose logs

# Проверьте порт 3000
netstat -tlnp | grep 3000  # Linux
netstat -ano | findstr :3000  # Windows

# Проверьте файлы данных
ls -la data/
```

### Ошибки доступа

```bash
# Проверьте права доступа к data/
# Docker: файлы должны принадлежать UID 1001
sudo chown -R 1001:1001 data/
```

### Нет доступа к админ-панели

1. Проверьте `ADMIN_ALLOWLIST` в `.env`
2. Убедитесь что ФИО точно совпадает
3. Перезапустите приложение

---

## 📚 Полная документация

Для production развертывания см:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Полное руководство по развертыванию
- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Чеклист перед деплоем
- **[README.md](./README.md)** - Общая информация о проекте

---

## 🎯 Что дальше?

1. **Настройте HTTPS** - см. DEPLOYMENT.md
2. **Настройте мониторинг** - health checks, логи
3. **Настройте автоматические бэкапы** - cron job
4. **Добавьте темы** - отредактируйте `data/topics_easy.json` и `data/topics_hard.json`

**Удачи! 🚀**






