# Руководство по настройке SSL для Vibe Wheel

## Информация о домене
- **Домен:** vibe-wheel.ru
- **Email:** dibrow.dmitrij@yandex.ru
- **Сервер:** 95.174.92.161 (vm-c0646c)

---

## Быстрая установка

### Шаг 1: Скопировать файлы на сервер
```bash
scp -i deploy-key nginx/nginx.conf user1@95.174.92.161:~/vibe-wheel/nginx/
scp -i deploy-key setup-ssl.sh user1@95.174.92.161:~/
```

### Шаг 2: Запустить установку SSL
```bash
ssh -i deploy-key user1@95.174.92.161
chmod +x ~/setup-ssl.sh
sudo ~/setup-ssl.sh
```

---

## Что делает скрипт

1. ✅ Проверяет, что Docker приложение работает
2. ✅ Устанавливает Nginx
3. ✅ Устанавливает Certbot (для Let's Encrypt)
4. ✅ Получает бесплатный SSL сертификат
5. ✅ Настраивает Nginx как reverse proxy
6. ✅ Настраивает автоматическое обновление сертификата
7. ✅ Запускает Nginx

---

## После установки

Ваш сайт будет доступен по адресам:
- **Основной сайт:** https://vibe-wheel.ru
- **Админ панель:** https://vibe-wheel.ru/admin

HTTP запросы будут автоматически перенаправляться на HTTPS.

---

## Архитектура

```
Браузер → HTTPS (443) → Nginx → Docker (3000) → Next.js App
              ↓
    Let's Encrypt SSL
    (бесплатно, автообновление)
```

---

## Полезные команды

### Проверка статуса Nginx
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo systemctl status nginx'
```

### Перезагрузка Nginx (после изменений)
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo systemctl reload nginx'
```

### Проверка сертификата
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo certbot certificates'
```

### Тест обновления сертификата
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo certbot renew --dry-run'
```

### Просмотр логов Nginx
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo tail -f /var/log/nginx/access.log'
ssh -i deploy-key user1@95.174.92.161 'sudo tail -f /var/log/nginx/error.log'
```

---

## Обновление конфигурации Nginx

Если нужно обновить конфигурацию:

```bash
# 1. Скопировать новый файл
scp -i deploy-key nginx/nginx.conf user1@95.174.92.161:/tmp/

# 2. Применить на сервере
ssh -i deploy-key user1@95.174.92.161 'sudo mv /tmp/nginx.conf /etc/nginx/nginx.conf && sudo nginx -t && sudo systemctl reload nginx'
```

---

## Автоматическое обновление сертификата

Сертификат Let's Encrypt действителен 90 дней и **обновляется автоматически**.

Certbot настроен через systemd timer и будет проверять обновление дважды в день.

Проверить статус:
```bash
ssh -i deploy-key user1@95.174.92.161 'sudo systemctl status certbot.timer'
```

---

## Решение проблем

### Проблема: "Address already in use" на порту 80
**Решение:** Остановите приложение или другие сервисы на порту 80:
```bash
sudo lsof -i :80
sudo systemctl stop nginx
```

### Проблема: Не удается получить сертификат
**Причины:**
1. DNS еще не распространился (подождите 10-30 минут)
2. Порт 80 заблокирован файрволлом
3. Другой сервис использует порт 80

**Проверка:**
```bash
# Проверить DNS
nslookup vibe-wheel.ru 8.8.8.8

# Проверить порт 80
sudo lsof -i :80
```

### Проблема: Nginx не запускается
**Решение:** Проверьте логи:
```bash
sudo nginx -t
sudo journalctl -u nginx -n 50
```

---

## Безопасность

✅ Используется TLS 1.2 и TLS 1.3
✅ Сильные шифры
✅ HSTS включен
✅ HTTP→HTTPS редирект
✅ Автообновление сертификата

---

**Дата создания:** 18 декабря 2025
**Версия:** 1.0
