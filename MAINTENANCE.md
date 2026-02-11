# Руководство по обслуживанию

Это руководство описывает регулярные задачи по обслуживанию приложения Vibe Wheel.

## 📅 Регулярные задачи

### Ежедневно

#### 1. Проверка работоспособности

```bash
# Проверка health check
curl http://localhost:3000/api/health

# Проверка логов на ошибки
docker-compose logs --tail=100 | grep -i error

# Проверка использования ресурсов
docker stats vibe-wheel-app --no-stream
```

#### 2. Автоматическое резервное копирование

Убедитесь, что cron job работает (настраивается один раз):

```bash
# Проверка cron jobs
crontab -l

# Проверка последнего бэкапа
ls -lth backups/ | head -5

# Проверка логов бэкапа
tail -20 logs/backup.log
```

### Еженедельно

#### 1. Проверка дискового пространства

```bash
# Общее использование
df -h

# Использование директории приложения
du -sh /path/to/vibe-wheel
du -sh /path/to/vibe-wheel/data
du -sh /path/to/vibe-wheel/backups
du -sh /path/to/vibe-wheel/logs
```

#### 2. Ротация и очистка логов

```bash
# Удалить старые логи (старше 30 дней)
find logs/ -name "*.log" -type f -mtime +30 -delete

# Очистить Docker логи если они слишком большие
docker-compose down
truncate -s 0 $(docker inspect --format='{{.LogPath}}' vibe-wheel-app)
docker-compose up -d
```

#### 3. Проверка бэкапов

```bash
# Список всех бэкапов
ls -lh backups/

# Тест восстановления (раз в месяц)
# Создайте тестовую директорию и проверьте восстановление
mkdir test-restore
cd test-restore
../scripts/restore.sh ../backups/latest-backup.tar.gz
# Проверьте что файлы корректны
ls -la data/
```

### Ежемесячно

#### 1. Обновление системы

```bash
# Обновление ОС (Ubuntu/Debian)
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# Перезагрузка если требуется
sudo reboot
```

#### 2. Обновление Docker образов

```bash
# Обновление base образов
docker-compose pull

# Пересборка приложения
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Проверка
curl http://localhost:3000/api/health
```

#### 3. Аудит безопасности

```bash
# Проверка уязвимостей в зависимостях
npm audit

# Обновление зависимостей (если безопасно)
npm update
npm run build
npm test  # если есть тесты

# Проверка Docker уязвимостей
docker scan vibe-wheel:latest
```

#### 4. Проверка SSL сертификатов

```bash
# Проверка срока действия
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Let's Encrypt обновляется автоматически, но проверьте:
sudo certbot renew --dry-run
```

### Ежеквартально

#### 1. Полная проверка системы

- [ ] Проверьте все элементы из PRODUCTION_CHECKLIST.md
- [ ] Убедитесь что все мониторинги работают
- [ ] Проверьте что алерты настроены и работают
- [ ] Обновите документацию если что-то изменилось

#### 2. Ревью безопасности

- [ ] Проверьте список администраторов (ADMIN_ALLOWLIST)
- [ ] Убедитесь что нет неиспользуемых аккаунтов
- [ ] Проверьте логи на подозрительную активность
- [ ] Обновите пароли/ключи если необходимо

---

## 🔧 Типовые операции

### Перезапуск приложения

```bash
# Docker
docker-compose restart

# PM2
pm2 restart vibe-wheel

# Systemd
sudo systemctl restart vibe-wheel
```

### Просмотр логов

```bash
# Docker - последние 100 строк
docker-compose logs --tail=100 -f

# Docker - поиск ошибок
docker-compose logs | grep -i error

# PM2
pm2 logs vibe-wheel

# Файлы логов
tail -f logs/out.log
tail -f logs/err.log
```

### Очистка дискового пространства

```bash
# Удалить неиспользуемые Docker образы и контейнеры
docker system prune -a

# Удалить старые бэкапы (старше 60 дней)
find backups/ -name "*.tar.gz" -type f -mtime +60 -delete

# Архивировать старые логи
gzip logs/*.log.old
```

### Обновление приложения

```bash
# 1. Создайте бэкап
./scripts/backup.sh

# 2. Загрузите новую версию
git pull

# 3. Пересоберите (Docker)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 4. Проверьте работоспособность
curl http://localhost:3000/api/health
docker-compose logs --tail=50
```

### Добавление администратора

```bash
# 1. Отредактируйте .env
nano .env
# Добавьте ФИО в ADMIN_ALLOWLIST="Иван Иванов;Новый Админ"

# 2. Перезапустите приложение
docker-compose restart

# 3. Проверьте что новый админ может войти
```

### Добавление новых тем

```bash
# 1. Создайте бэкап текущих данных
./scripts/backup.sh

# 2. Отредактируйте файлы тем
nano data/topics_easy.json
nano data/topics_hard.json

# 3. Проверьте валидность JSON
python3 -m json.tool data/topics_easy.json > /dev/null
python3 -m json.tool data/topics_hard.json > /dev/null

# 4. Перезапустите приложение
docker-compose restart
```

---

## 📊 Мониторинг

### Ключевые метрики

Следите за следующими метриками:

1. **Uptime**: должен быть > 99.9%
2. **Response Time**: < 1 секунда для 95% запросов
3. **Memory Usage**: < 80% от доступной
4. **Disk Usage**: < 80% от доступного
5. **Error Rate**: < 1% от всех запросов

### Алерты

Настройте алерты для:

- Приложение недоступно (health check failed)
- Memory usage > 90%
- Disk usage > 85%
- Error rate > 5%
- SSL сертификат истекает < 30 дней
- Бэкап не создан более 25 часов

### Инструменты мониторинга

**Рекомендуемые:**
- **Uptime Robot** (бесплатный) - HTTP мониторинг
- **Grafana + Prometheus** - метрики и графики
- **Netdata** (бесплатный) - системные метрики в реальном времени

**Простой скрипт для мониторинга:**

```bash
#!/bin/bash
# monitor.sh - простой мониторинг скрипт

# Health check
if ! curl -sf http://localhost:3000/api/health > /dev/null; then
    echo "ERROR: Application health check failed" | mail -s "Vibe Wheel Alert" admin@company.com
fi

# Disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "WARNING: Disk usage is ${DISK_USAGE}%" | mail -s "Vibe Wheel Disk Alert" admin@company.com
fi

# Memory
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "WARNING: Memory usage is ${MEM_USAGE}%" | mail -s "Vibe Wheel Memory Alert" admin@company.com
fi
```

Добавьте в cron для запуска каждые 5 минут:

```bash
*/5 * * * * /path/to/monitor.sh
```

---

## 🆘 Troubleshooting типовых проблем

### Приложение не отвечает

```bash
# 1. Проверьте статус контейнера
docker-compose ps

# 2. Проверьте логи
docker-compose logs --tail=50

# 3. Перезапустите
docker-compose restart

# 4. Если не помогло - полный перезапуск
docker-compose down
docker-compose up -d
```

### Высокое использование памяти

```bash
# 1. Проверьте использование
docker stats vibe-wheel-app

# 2. Если > 1GB - перезапустите
docker-compose restart

# 3. Если проблема повторяется - увеличьте лимит в docker-compose.yml
```

### Закончилось место на диске

```bash
# 1. Проверьте что занимает место
du -sh /path/to/vibe-wheel/*

# 2. Очистите старые бэкапы
find backups/ -name "*.tar.gz" -type f -mtime +30 -delete

# 3. Очистите Docker
docker system prune -a

# 4. Ротируйте логи
truncate -s 0 logs/*.log
```

### Ошибки при чтении/записи данных

```bash
# 1. Проверьте права доступа
ls -la data/

# 2. Исправьте если нужно (Docker использует UID 1001)
sudo chown -R 1001:1001 data/

# 3. Проверьте валидность JSON
python3 -m json.tool data/state.json > /dev/null

# 4. Восстановите из бэкапа если файл повреждён
./scripts/restore.sh ./backups/latest-backup.tar.gz
```

---

## 📞 Контакты для экстренных случаев

Обновите эту секцию контактами вашей команды:

- **Tech Lead**: Имя, телефон, email
- **DevOps**: Имя, телефон, email
- **Дежурный админ**: телефон, rotation schedule
- **Escalation path**: кого звонить если основные не отвечают

---

## 📝 История обслуживания

Ведите лог выполненных работ:

| Дата | Операция | Выполнил | Результат | Примечания |
|------|----------|----------|-----------|------------|
| YYYY-MM-DD | Обновление системы | Имя | ✓ | Ubuntu security updates |
| YYYY-MM-DD | Добавление админа | Имя | ✓ | Добавлен Иван Иванов |
| YYYY-MM-DD | Восстановление из бэкапа | Имя | ✓ | После сбоя диска |

---

*Последнее обновление: 2025-12-17*






