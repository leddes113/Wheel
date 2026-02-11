# 🔒 Меры безопасности Vibe Wheel

## ✅ Что защищено

### 1. **Защита от DDoS атак**

#### Rate Limiting (ограничение скорости запросов)
- **Обычные страницы:** не более 10 запросов/сек с одного IP (burst до 20)
- **API endpoints:** не более 5 запросов/сек с одного IP (burst до 10)
- При превышении лимита: HTTP 503 (Service Temporarily Unavailable)

#### Connection Limiting (ограничение соединений)
- **Максимум:** 10 одновременных соединений с одного IP
- Защищает от slowloris и подобных атак

#### Timeout защита
- Client body timeout: 10 секунд
- Client header timeout: 10 секунд
- Send timeout: 10 секунд
- Защищает от медленных атак (slow HTTP attacks)

### 2. **Защита портов**

#### Открытые порты (через файрволл UFW):
- ✅ **22/tcp** - SSH (для администрирования)
- ✅ **80/tcp** - HTTP (автоматический редирект на HTTPS)
- ✅ **443/tcp** - HTTPS (основной доступ)

#### Закрытые порты:
- ❌ **3000/tcp** - Next.js приложение (доступно только через localhost)
  - Docker биндинг: `127.0.0.1:3000` вместо `0.0.0.0:3000`
  - Доступ возможен только через Nginx reverse proxy

### 3. **SSL/TLS безопасность**

- ✅ **Let's Encrypt SSL сертификат** (автообновление каждые 90 дней)
- ✅ **TLS 1.2 и TLS 1.3** (старые протоколы отключены)
- ✅ **HSTS** (Strict-Transport-Security)
  - Браузер автоматически использует HTTPS
  - Max age: 1 год
  - IncludeSubDomains: включено
- ✅ **HTTP/2** для лучшей производительности

### 4. **Дополнительные заголовки безопасности**

```nginx
X-Frame-Options: SAMEORIGIN          # Защита от clickjacking
X-Content-Type-Options: nosniff       # Защита от MIME-type sniffing
X-XSS-Protection: 1; mode=block       # Дополнительная защита от XSS
Referrer-Policy: strict-origin-when-cross-origin  # Контроль Referer header
```

### 5. **Блокировка вредоносных ботов**

Автоматически блокируются User-Agent содержащие:
- `nikto` (сканер уязвимостей)
- `sqlmap` (SQL injection инструмент)
- `nmap` (сканер портов)
- `masscan` (массовый сканер)
- Различные scraper/spider боты (кроме легитимных поисковиков)

Легитимные инструменты разрешены:
- `curl` (для мониторинга)
- `wget` (для скачивания)

### 6. **Docker безопасность**

- ✅ Приложение работает от **непривилегированного пользователя** (`nextjs`, UID 1001)
- ✅ Только необходимые volume монтируются (data, logs)
- ✅ Network isolation (порт 3000 не exposed наружу)
- ✅ Автоматический перезапуск при сбоях

---

## 📊 Мониторинг атак

### Проверка логов атак
```bash
# Последние 100 заблокированных запросов (rate limit)
ssh -i deploy-key user1@95.174.92.161 "sudo grep 'limiting requests' /var/log/nginx/error.log | tail -100"

# Последние заблокированные боты
ssh -i deploy-key user1@95.174.92.161 "sudo grep '403' /var/log/nginx/access.log | tail -100"

# Топ IP адресов по количеству запросов
ssh -i deploy-key user1@95.174.92.161 "sudo awk '{print \$1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20"
```

### Статистика в реальном времени
```bash
# Мониторинг логов в реальном времени
ssh -i deploy-key user1@95.174.92.161 "sudo tail -f /var/log/nginx/access.log"

# Только ошибки
ssh -i deploy-key user1@95.174.92.161 "sudo tail -f /var/log/nginx/error.log"
```

---

## ⚠️ Что НЕ защищено (рекомендации для будущего)

### 1. Распределенные DDoS атаки (DDoS от множества IP)
**Текущая защита:** Rate limiting помогает, но крупные ботнеты могут обойти

**Решение:**
- Использовать Cloudflare (бесплатный тариф)
- Настроить fail2ban для автоматической блокировки IP

### 2. Application-level атаки
**Примеры:** SQL injection, XSS, CSRF

**Текущая защита:** Базовая (заголовки безопасности, Next.js встроенная защита)

**Решение:**
- Регулярно обновлять зависимости
- Проводить security audit кода
- Использовать WAF (Web Application Firewall)

### 3. Нет географической фильтрации
**Решение:** Можно настроить GeoIP блокировку в Nginx (если атаки идут из конкретных стран)

---

## 🛡️ Дополнительная защита (опционально)

### Установка fail2ban (автоматическая блокировка атакующих IP)

```bash
ssh -i deploy-key user1@95.174.92.161

# Установка
sudo apt update
sudo apt install fail2ban -y

# Создание конфига для Nginx
sudo tee /etc/fail2ban/jail.local << 'EOF'
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 60
bantime = 3600
EOF

# Перезапуск
sudo systemctl restart fail2ban
```

### Интеграция с Cloudflare (бесплатно)

1. Зарегистрируйтесь на [Cloudflare](https://cloudflare.com)
2. Добавьте домен `vibe-wheel.ru`
3. Измените DNS серверы у регистратора на Cloudflare NS
4. Включите режим "Under Attack" при DDoS атаках

**Преимущества:**
- Защита от DDoS любого масштаба
- CDN (кеширование контента)
- Бесплатный SSL
- Web Application Firewall (WAF)

---

## 📋 Checklist безопасности

- [x] SSL/TLS сертификат установлен
- [x] HTTPS включен (HTTP редиректит на HTTPS)
- [x] Rate limiting настроен
- [x] Connection limiting настроен
- [x] Порт 3000 закрыт извне
- [x] Firewall (UFW) активен
- [x] Вредоносные боты блокируются
- [x] Заголовки безопасности установлены
- [x] Docker работает от непривилегированного пользователя
- [ ] fail2ban установлен (опционально)
- [ ] Cloudflare настроен (опционально)
- [ ] Резервное копирование настроено (опционально)

---

## 🔍 Тестирование защиты

### Проверка Rate Limiting
```bash
# Отправить 20 быстрых запросов (должны быть заблокированы после 10-20)
for i in {1..20}; do curl -I https://vibe-wheel.ru && sleep 0.05; done
```

### Проверка закрытия порта 3000
```bash
# Должен вернуть "Connection refused"
curl http://95.174.92.161:3000
```

### Проверка SSL
```bash
# Должен показать A или A+ рейтинг
curl -I https://vibe-wheel.ru
```

Также можно проверить на [SSL Labs](https://www.ssllabs.com/ssltest/analyze.html?d=vibe-wheel.ru)

---

## 📞 В случае атаки

### Экстренные меры:

1. **Включить режим "maintenance mode"** (временно отключить сайт):
```bash
ssh -i deploy-key user1@95.174.92.161 "docker stop vibe-wheel-app"
```

2. **Заблокировать конкретный IP**:
```bash
ssh -i deploy-key user1@95.174.92.161 "sudo ufw deny from АТАКУЮЩИЙ_IP"
```

3. **Временно ужесточить rate limiting**:
Отредактируйте `/etc/nginx/nginx.conf` и измените:
```nginx
limit_req_zone $binary_remote_addr zone=general:10m rate=1r/s;  # вместо 10r/s
limit_req_zone $binary_remote_addr zone=api:10m rate=1r/s;      # вместо 5r/s
```

4. **Перезапустить Nginx**:
```bash
ssh -i deploy-key user1@95.174.92.161 "sudo systemctl reload nginx"
```

---

## 📈 Рекомендации по мониторингу

Настройте оповещения на:
- Высокую нагрузку CPU/RAM
- Большое количество 503 ошибок (rate limit)
- Большое количество 403 ошибок (блокировка ботов)
- Недоступность сайта

Можно использовать:
- [UptimeRobot](https://uptimerobot.com) (бесплатный мониторинг доступности)
- Prometheus + Grafana (продвинутый мониторинг)

---

**Дата:** 19 декабря 2025  
**Статус:** ✅ Базовая защита активна и работает  
**Уровень защиты:** Средний (достаточно для малого/среднего проекта)
