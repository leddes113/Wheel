# Руководство по развертыванию Vibe Wheel

Это руководство описывает различные способы развертывания приложения Vibe Wheel на production сервере.

## Содержание

1. [Подготовка к деплою](#подготовка-к-деплою)
2. [Развертывание через Docker](#развертывание-через-docker)
3. [Развертывание без Docker](#развертывание-без-docker)
4. [Резервное копирование данных](#резервное-копирование-данных)
5. [Мониторинг и логирование](#мониторинг-и-логирование)
6. [Безопасность](#безопасность)
7. [Troubleshooting](#troubleshooting)

---

## Подготовка к деплою

### 1. Системные требования

**Минимальные:**
- CPU: 1 core
- RAM: 512 MB
- Disk: 1 GB
- Node.js: 20.x или выше (если без Docker)
- Docker: 20.x или выше (если с Docker)

**Рекомендуемые для production:**
- CPU: 2+ cores
- RAM: 2 GB
- Disk: 5 GB (с учетом логов и бэкапов)

### 2. Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
# Список администраторов (разделитель - точка с запятой)
ADMIN_ALLOWLIST="Иван Иванов;Петр Петров"

# Node environment
NODE_ENV=production

# Опционально: порт приложения (по умолчанию 3000)
# PORT=3000
```

### 3. Подготовка данных

Убедитесь, что директория `data/` содержит необходимые файлы:
- `topics_easy.json` - темы для начинающих
- `topics_hard.json` - темы для опытных
- `state.json` - состояние приложения (создастся автоматически, если отсутствует)

---

## Развертывание через Docker

### Вариант 1: Простое развертывание (только приложение)

**Шаг 1:** Клонируйте репозиторий и перейдите в директорию

```bash
git clone <repository-url>
cd vibe-wheel
```

**Шаг 2:** Создайте `.env` файл с необходимыми переменными

```bash
cp .env.example .env
# Отредактируйте .env файл
```

**Шаг 3:** Запустите приложение через Docker Compose

```bash
docker-compose up -d
```

**Шаг 4:** Проверьте работоспособность

```bash
# Проверка статуса контейнера
docker-compose ps

# Проверка логов
docker-compose logs -f

# Health check
curl http://localhost:3000/api/health
```

Приложение будет доступно на `http://localhost:3000`

### Вариант 2: Production с Nginx (рекомендуется)

Этот вариант включает Nginx как reverse proxy с SSL, rate limiting и улучшенной безопасностью.

**Шаг 1-2:** Те же, что и в варианте 1

**Шаг 3:** Создайте директорию для SSL сертификатов (если используете HTTPS)

```bash
mkdir -p nginx/ssl
# Скопируйте ваши SSL сертификаты в nginx/ssl/
```

**Шаг 4:** Запустите с production конфигурацией

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Шаг 5:** Проверьте работоспособность

```bash
# Проверка статуса
docker-compose -f docker-compose.prod.yml ps

# Проверка логов
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl http://localhost/api/health
```

Приложение будет доступно на:
- HTTP: `http://your-domain.com` (порт 80)
- HTTPS: `https://your-domain.com` (порт 443, после настройки SSL)

### Управление Docker контейнерами

```bash
# Остановка приложения
docker-compose down

# Перезапуск
docker-compose restart

# Просмотр логов
docker-compose logs -f vibe-wheel

# Обновление приложения
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Очистка неиспользуемых образов
docker system prune -a
```

---

## Развертывание без Docker

### Шаг 1: Установка зависимостей

```bash
# Установите Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонируйте репозиторий
git clone <repository-url>
cd vibe-wheel

# Установите зависимости
npm ci --only=production
```

### Шаг 2: Настройка переменных окружения

```bash
cp .env.example .env
# Отредактируйте .env файл
```

### Шаг 3: Сборка приложения

```bash
npm run build
```

### Шаг 4: Запуск приложения

**Вариант A: Напрямую**

```bash
npm start
```

**Вариант B: С PM2 (рекомендуется для production)**

```bash
# Установите PM2 глобально
npm install -g pm2

# Создайте конфигурационный файл ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'vibe-wheel',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Создайте директорию для логов
mkdir -p logs

# Запустите приложение
pm2 start ecosystem.config.js

# Настройте автозапуск при перезагрузке сервера
pm2 startup
pm2 save
```

**Управление через PM2:**

```bash
# Статус
pm2 status

# Логи
pm2 logs vibe-wheel

# Перезапуск
pm2 restart vibe-wheel

# Остановка
pm2 stop vibe-wheel

# Удаление из PM2
pm2 delete vibe-wheel
```

### Шаг 5: Настройка Nginx (опционально, но рекомендуется)

```bash
# Установите Nginx
sudo apt-get install nginx

# Создайте конфигурацию
sudo nano /etc/nginx/sites-available/vibe-wheel

# Скопируйте содержимое из nginx/nginx.conf (адаптируйте под systemd)
# Не забудьте изменить upstream на localhost:3000

# Активируйте конфигурацию
sudo ln -s /etc/nginx/sites-available/vibe-wheel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Резервное копирование данных

### Автоматическое резервное копирование

**Linux/MacOS (через cron):**

```bash
# Сделайте скрипты исполняемыми
chmod +x scripts/backup.sh scripts/restore.sh

# Добавьте в crontab для ежедневного бэкапа в 3:00
crontab -e
# Добавьте строку:
0 3 * * * cd /path/to/vibe-wheel && ./scripts/backup.sh >> ./logs/backup.log 2>&1
```

**Windows (через Task Scheduler):**

1. Откройте Task Scheduler
2. Создайте новую задачу
3. Триггер: ежедневно в 3:00
4. Действие: Запустить программу
   - Программа: `powershell.exe`
   - Аргументы: `-File C:\path\to\vibe-wheel\scripts\backup.ps1`

### Ручное резервное копирование

**Linux/MacOS:**

```bash
# Создание бэкапа
./scripts/backup.sh

# Восстановление из бэкапа
./scripts/restore.sh ./backups/vibe-wheel-backup-20250101_030000.tar.gz
```

**Windows:**

```powershell
# Создание бэкапа
.\scripts\backup.ps1

# Восстановление из бэкапа
.\scripts\restore.ps1 -BackupFile .\backups\vibe-wheel-backup-20250101_030000.zip
```

### Настройка retention policy

По умолчанию хранятся бэкапы за последние 30 дней. Изменить можно через переменную окружения:

```bash
# Linux/MacOS
export RETENTION_DAYS=60
./scripts/backup.sh

# Windows
$env:RetentionDays = 60
.\scripts\backup.ps1
```

---

## Мониторинг и логирование

### Health Check Endpoint

Приложение предоставляет endpoint для проверки работоспособности:

```bash
curl http://localhost:3000/api/health
```

Ответ при нормальной работе:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-17T10:00:00.000Z",
  "uptime": 3600,
  "version": "0.1.0"
}
```

### Настройка мониторинга

**Uptime Kuma / Uptimerobot:**
- Мониторьте `/api/health` endpoint каждые 60 секунд
- Алерт при статусе != 200 или status != "healthy"

**Grafana + Prometheus:**
- Используйте blackbox_exporter для HTTP проверок
- Мониторьте response time и uptime

### Логи

**Docker:**
```bash
# Просмотр логов приложения
docker-compose logs -f vibe-wheel

# Логи Nginx (если используется prod конфигурация)
docker-compose logs -f nginx

# Логи сохраняются в ./logs/
```

**PM2:**
```bash
# Просмотр логов в реальном времени
pm2 logs vibe-wheel

# Логи сохраняются в ./logs/out.log и ./logs/err.log
```

---

## Безопасность

### 1. Защита админ-панели

Админ-доступ контролируется через `ADMIN_ALLOWLIST` в `.env`:

```env
ADMIN_ALLOWLIST="Иван Иванов;Петр Петров;Анна Сидорова"
```

Убедитесь, что:
- `.env` файл НЕ доступен через веб
- Используйте точные ФИО из списка
- Регулярно обновляйте список при изменении команды

### 2. HTTPS (настоятельно рекомендуется)

**С Let's Encrypt (бесплатно):**

```bash
# Установите certbot
sudo apt-get install certbot python3-certbot-nginx

# Получите сертификат
sudo certbot --nginx -d your-domain.com

# Certbot автоматически настроит Nginx и создаст cron для обновления
```

**С собственным сертификатом:**

```bash
# Скопируйте сертификаты
cp cert.pem nginx/ssl/cert.pem
cp key.pem nginx/ssl/key.pem

# Раскомментируйте HTTPS секцию в nginx/nginx.conf
# Перезапустите Nginx
```

### 3. Firewall

```bash
# Разрешите только необходимые порты
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 4. Rate Limiting

Rate limiting уже настроен в `nginx/nginx.conf`:
- API endpoints: 10 запросов/сек (burst до 20)
- Остальные: 30 запросов/сек (burst до 50)

### 5. Регулярные обновления

```bash
# Обновляйте систему
sudo apt-get update && sudo apt-get upgrade

# Обновляйте Docker образы
docker-compose pull
docker-compose up -d

# Обновляйте зависимости приложения
npm audit
npm update
```

---

## Troubleshooting

### Приложение не запускается

**Проверьте логи:**
```bash
# Docker
docker-compose logs vibe-wheel

# PM2
pm2 logs vibe-wheel
```

**Частые проблемы:**
1. Порт 3000 занят → измените PORT в `.env`
2. Недостаточно памяти → увеличьте RAM или установите swap
3. Отсутствуют файлы данных → восстановите из бэкапа или создайте пустые

### Health check failed

```bash
# Проверьте доступность файлов данных
ls -la data/

# Проверьте права доступа (Docker)
docker-compose exec vibe-wheel ls -la /app/data/

# Проверьте, что приложение слушает на правильном порту
docker-compose exec vibe-wheel netstat -tlnp | grep 3000
```

### Ошибки при чтении/записи данных

```bash
# Проверьте права доступа
# Docker:
docker-compose exec vibe-wheel ls -la /app/data/
# Файлы должны принадлежать пользователю nextjs (UID 1001)

# Исправьте права если нужно
sudo chown -R 1001:1001 data/
```

### Приложение работает медленно

1. Проверьте использование ресурсов:
```bash
# Docker
docker stats vibe-wheel

# Система
htop
```

2. Проверьте логи на ошибки
3. Увеличьте ресурсы сервера
4. Оптимизируйте Nginx кеширование

### Нет доступа к админ-панели

1. Проверьте `ADMIN_ALLOWLIST` в `.env`
2. Убедитесь, что ФИО точно совпадает (с учетом пробелов)
3. Перезапустите приложение после изменения `.env`

---

## Дополнительные ресурсы

- [Next.js Production Deployment](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Поддержка

При возникновении проблем:
1. Проверьте раздел [Troubleshooting](#troubleshooting)
2. Изучите логи приложения
3. Создайте issue в репозитории проекта
