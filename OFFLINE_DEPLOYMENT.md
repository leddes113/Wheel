# Инструкция по офлайн-деплою (без интернета)

## 📋 Обзор

Этот документ описывает процесс развертывания приложения Vibe Coding Wheel на машине **без доступа к интернету**.

---

## ⚠️ Важные изменения для офлайн-работы

### 1. Шрифты
Google Fonts **закомментирован** в `app/globals.css`. Приложение использует системные шрифты:
- Inter (если установлен локально)
- Segoe UI (Windows)
- San Francisco (macOS)
- Roboto (Linux/Android)

**Для восстановления Google Fonts** (если будет интернет):
Раскомментируйте в `app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
```

---

## 🎯 Способ 1: Деплой с Pre-Built образом (рекомендуется)

### На машине С интернетом:

#### Шаг 1: Подготовка файлов
```bash
# Клонируйте репозиторий
git clone https://github.com/leddes113/Wheel.git vibe-wheel
cd vibe-wheel

# Установите зависимости
npm install

# Создайте .env файл
cat > .env << 'EOF'
ADMIN_ALLOWLIST=Дибров Дмитрий Алексеевич;Забудько Алексей Викторович;Рыжих Владислав Васильевич;Быков Сергей Дмитриевич;Бобович Павел Александрович
NODE_ENV=production
EOF

# Соберите проект
npm run build
```

#### Шаг 2: Создание архива
```bash
# Создайте архив со всеми необходимыми файлами
tar -czf vibe-wheel-offline.tar.gz \
  .next/ \
  node_modules/ \
  data/ \
  scripts/ \
  public/ \
  package.json \
  package-lock.json \
  .env \
  next.config.ts \
  tsconfig.json

# Архив готов для переноса
ls -lh vibe-wheel-offline.tar.gz
```

### На машине БЕЗ интернета:

```bash
# Распакуйте архив
tar -xzf vibe-wheel-offline.tar.gz

# Запустите приложение
npm start

# Приложение доступно на http://localhost:3000
```

---

## 🐳 Способ 2: Деплой с Docker (полностью офлайн)

### На машине С интернетом:

#### Шаг 1: Создайте Docker образ
```bash
# Соберите образ
docker build -t vibe-wheel:latest .

# Сохраните образ в файл
docker save vibe-wheel:latest -o vibe-wheel-image.tar

# Также сохраните базовый образ node (опционально, если его нет на целевой машине)
docker pull node:20-alpine
docker save node:20-alpine -o node-20-alpine.tar
```

#### Шаг 2: Подготовьте конфигурацию
```bash
# Создайте архив с конфигурацией
tar -czf vibe-wheel-docker-config.tar.gz \
  docker-compose.yml \
  docker-compose.prod.yml \
  .env \
  data/

# Скопируйте файлы на USB/флешку:
# - vibe-wheel-image.tar
# - node-20-alpine.tar (если нужен)
# - vibe-wheel-docker-config.tar.gz
```

### На машине БЕЗ интернета:

```bash
# Загрузите образы Docker
docker load -i node-20-alpine.tar    # если нужен
docker load -i vibe-wheel-image.tar

# Распакуйте конфигурацию
tar -xzf vibe-wheel-docker-config.tar.gz

# Запустите контейнер
docker-compose -f docker-compose.prod.yml up -d

# Проверьте статус
docker-compose logs -f
```

---

## 📦 Способ 3: Полностью ручной деплой (без Docker)

### На машине С интернетом:

```bash
# 1. Установите Node.js 20+ (если его нет на целевой машине)
# Скачайте установщик с https://nodejs.org/

# 2. Подготовьте полный пакет
npm install
npm run build

# 3. Создайте полный архив
tar -czf vibe-wheel-full.tar.gz .

# 4. Скопируйте на USB:
# - vibe-wheel-full.tar.gz
# - node-v20.x.x-linux-x64.tar.gz (установщик Node.js)
```

### На машине БЕЗ интернета:

```bash
# 1. Установите Node.js (если нужно)
tar -xzf node-v20.x.x-linux-x64.tar.gz
export PATH=$PWD/node-v20.x.x-linux-x64/bin:$PATH

# 2. Распакуйте приложение
mkdir vibe-wheel && cd vibe-wheel
tar -xzf ../vibe-wheel-full.tar.gz

# 3. Настройте окружение
cat > .env << 'EOF'
ADMIN_ALLOWLIST=Ваши Админы Здесь
NODE_ENV=production
PORT=3000
EOF

# 4. Запустите
npm start
```

---

## 🔧 Важные файлы для переноса

### Минимальный набор (после сборки):
```
.next/                  # Собранное приложение
node_modules/           # Зависимости
data/                   # Данные (темы, пользователи)
  ├── topics_easy.json
  ├── topics_hard.json
  └── state.json
scripts/                # Вспомогательные скрипты
  ├── init-data.js
  └── check-env.js
public/                 # Статические файлы (если есть)
package.json            # Метаданные проекта
.env                    # Конфигурация окружения
next.config.ts          # Конфигурация Next.js
```

### Опциональные файлы:
```
docs/                   # Документация
README.md
DEPLOYMENT.md
```

---

## ✅ Проверка работоспособности

После запуска на офлайн-машине:

```bash
# 1. Проверьте health endpoint
curl http://localhost:3000/api/health

# Ожидаемый ответ:
# {"status":"ok","timestamp":"..."}

# 2. Откройте в браузере
# http://localhost:3000

# 3. Проверьте админ-панель
# http://localhost:3000/admin
```

---

## 🐛 Возможные проблемы и решения

### Проблема: "Cannot find module"
**Решение:** Убедитесь, что папка `node_modules` полностью скопирована

### Проблема: "Missing required environment variable: ADMIN_ALLOWLIST"
**Решение:** Создайте файл `.env` с переменной `ADMIN_ALLOWLIST`

### Проблема: "Port 3000 is already in use"
**Решение:** Измените порт в `.env`:
```env
PORT=3001
```

### Проблема: Шрифты выглядят иначе
**Решение:** Это нормально - используются системные шрифты. Для идентичного вида установите шрифт Inter локально или используйте Google Fonts (требуется интернет)

---

## 📊 Размеры файлов (приблизительно)

| Компонент | Размер |
|-----------|--------|
| node_modules/ | ~400 MB |
| .next/ (build) | ~50 MB |
| Docker образ | ~200 MB |
| Архив (gzip) | ~100-150 MB |

---

## 🔐 Безопасность

При офлайн-деплое:
1. ✅ Нет внешних API запросов
2. ✅ Все данные хранятся локально
3. ✅ Нет телеметрии (NEXT_TELEMETRY_DISABLED=1)
4. ⚠️ Убедитесь, что `.env` файл защищен (права 600)

---

## 📞 Поддержка

При проблемах с офлайн-деплоем проверьте:
- Версию Node.js (требуется 18.17+)
- Наличие всех файлов из архива
- Права доступа к папке `data/`
- Логи приложения

---

## 🔄 Обновление офлайн-версии

Для обновления приложения на офлайн-машине:
1. Подготовьте новый архив на машине с интернетом
2. Остановите текущую версию: `npm stop` или `docker-compose down`
3. Замените файлы из нового архива
4. Запустите снова

**Важно:** Сохраните папку `data/` при обновлении!
