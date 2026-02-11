# Руководство по деплою Vibe Wheel

## Информация о сервере
- **IP адрес:** 95.174.92.161
- **Имя машины:** vm-c0646c
- **Пользователь:** user1
- **Порт приложения:** 3000
- **Репозиторий:** git@github.com:leddes113/Wheel.git

## Администраторы
- Дибров Дмитрий Алексеевич
- Бобович Павел Александрович
- Забудько Алексей Викторович
- Рыжих Владислав Васильевич

---

## Быстрый деплой

### Windows (PowerShell)
```powershell
.\deploy.ps1
```

### Linux/macOS (Bash)
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Что делает скрипт деплоя

1. ✅ Проверяет подключение к серверу
2. 🐳 Устанавливает Docker и Docker Compose (если их нет)
3. 🗑️ Удаляет старую версию приложения
4. 📥 Клонирует свежую версию из GitHub
5. ⚙️ Создает .env файл с переменными окружения
6. 🔨 Собирает Docker образ
7. 🚢 Запускает контейнер с приложением
8. 🏥 Проверяет работоспособность

---

## После успешного деплоя

Приложение будет доступно по адресу:
- **Основное приложение:** http://95.174.92.161:3000
- **Админ панель:** http://95.174.92.161:3000/admin

---

## Полезные команды

### Подключение к серверу
```bash
ssh -i deploy-key user1@95.174.92.161
```

### Просмотр логов
```bash
ssh -i deploy-key user1@95.174.92.161 'docker logs -f vibe-wheel-app'
```

### Перезапуск приложения
```bash
ssh -i deploy-key user1@95.174.92.161 'docker restart vibe-wheel-app'
```

### Остановка приложения
```bash
ssh -i deploy-key user1@95.174.92.161 'docker stop vibe-wheel-app'
```

### Запуск приложения
```bash
ssh -i deploy-key user1@95.174.92.161 'docker start vibe-wheel-app'
```

### Проверка статуса
```bash
ssh -i deploy-key user1@95.174.92.161 'docker ps'
```

### Проверка health endpoint
```bash
curl http://95.174.92.161:3000/api/health
```

---

## Ручной деплой (если скрипт не работает)

### 1. Подключитесь к серверу
```bash
ssh -i deploy-key user1@95.174.92.161
```

### 2. Установите Docker (если нужно)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker user1
```

### 3. Клонируйте проект
```bash
cd ~
rm -rf vibe-wheel
git clone git@github.com:leddes113/Wheel.git vibe-wheel
cd vibe-wheel
```

### 4. Создайте .env файл
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич
NEXT_TELEMETRY_DISABLED=1
EOF
```

### 5. Соберите и запустите Docker контейнер
```bash
docker build -t vibe-wheel:latest .

docker run -d \
    --name vibe-wheel-app \
    --restart always \
    -p 3000:3000 \
    -e NODE_ENV=production \
    -e "ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Бобович Павел Александрович;Забудько Алексей Викторович;Рыжих Владислав Васильевич" \
    -v ~/vibe-wheel/data:/app/data:rw \
    -v ~/vibe-wheel/logs:/app/logs:rw \
    vibe-wheel:latest
```

### 6. Проверьте работу
```bash
docker logs -f vibe-wheel-app
curl http://localhost:3000/api/health
```

---

## Обновление приложения

Для обновления приложения просто запустите скрипт деплоя снова:
```bash
.\deploy.ps1
# или
./deploy.sh
```

Скрипт автоматически:
- Остановит старую версию
- Удалит старые файлы
- Склонирует новую версию
- Запустит обновленное приложение

---

## Решение проблем

### Проблема: "Permission denied" при подключении по SSH
**Решение:** Проверьте права на ключ:
```bash
chmod 600 deploy-key
```

### Проблема: "Cannot connect to Docker daemon"
**Решение:** Перезагрузите сессию или сервер после установки Docker:
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo reboot'
```
Подождите минуту и запустите деплой снова.

### Проблема: Порт 3000 занят
**Решение:** Остановите старый контейнер:
```bash
ssh -i deploy-key user1@95.174.92.161 'docker stop vibe-wheel-app && docker rm vibe-wheel-app'
```

### Проблема: "Permission denied" при клонировании репозитория
**Решение:** Убедитесь, что SSH ключ добавлен в GitHub:
```bash
# На сервере
ssh-keygen -t ed25519 -C "server@vm-c0646c"
cat ~/.ssh/id_ed25519.pub
# Добавьте этот ключ в GitHub Settings -> SSH Keys
```

---

## Архитектура деплоя

```
┌─────────────────────────────────────────┐
│          Docker Container               │
│  ┌───────────────────────────────────┐  │
│  │     Next.js App (Node 20)         │  │
│  │     Port 3000                     │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Volumes:                               │
│  - /app/data  (persistent data)         │
│  - /app/logs  (application logs)        │
└─────────────────────────────────────────┘
              ↑
              │ Port 3000
              ↓
        95.174.92.161:3000
```

---

## Мониторинг

### Проверка здоровья приложения
```bash
curl http://95.174.92.161:3000/api/health
```

Ожидаемый ответ:
```json
{"status":"ok","timestamp":"2025-12-18T..."}
```

### Мониторинг логов в реальном времени
```bash
ssh -i deploy-key user1@95.174.92.161 'docker logs -f vibe-wheel-app'
```

### Проверка использования ресурсов
```bash
ssh -i deploy-key user1@95.174.92.161 'docker stats vibe-wheel-app'
```

---

## Резервное копирование данных

### Создание бэкапа
```bash
ssh -i deploy-key user1@95.174.92.161 'cd ~/vibe-wheel && tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz data/'
```

### Скачивание бэкапа
```bash
scp -i deploy-key user1@95.174.92.161:~/vibe-wheel/backup-*.tar.gz ./
```

### Восстановление из бэкапа
```bash
# Загрузите бэкап на сервер
scp -i deploy-key backup-YYYYMMDD-HHMMSS.tar.gz user1@95.174.92.161:~/

# Восстановите данные
ssh -i deploy-key user1@95.174.92.161 '
    cd ~/vibe-wheel
    docker stop vibe-wheel-app
    rm -rf data/*
    tar -xzf ~/backup-YYYYMMDD-HHMMSS.tar.gz
    docker start vibe-wheel-app
'
```

---

## Безопасность

1. ✅ Приложение работает от непривилегированного пользователя (nextjs)
2. ✅ Телеметрия Next.js отключена
3. ✅ Данные хранятся локально в volumes
4. ⚠️ Рекомендуется настроить firewall и открыть только нужные порты
5. ⚠️ Для production рекомендуется использовать HTTPS (nginx + SSL)

---

## Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Проверьте статус Docker контейнера
3. Проверьте health endpoint
4. Обратитесь к документации в репозитории

---

**Дата создания:** 18 декабря 2025
**Версия:** 1.0

