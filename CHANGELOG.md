# Changelog

Все значимые изменения в проекте будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Добавлено
- Docker контейнеризация (Dockerfile, docker-compose.yml)
- Production конфигурация с Nginx (docker-compose.prod.yml)
- Health check endpoint (`/api/health`)
- Скрипты резервного копирования (Linux/Mac и Windows)
- Comprehensive deployment documentation (DEPLOYMENT.md)
- Обновленный README с полной документацией
- GitHub Actions workflow для автоматической сборки Docker образа
- Nginx конфигурация с rate limiting и security headers
- .dockerignore для оптимизации сборки образа
- Production environment variables template (.env.production)

### Изменено
- Next.js конфигурация для standalone output (Docker deployment)
- Отключена телеметрия Next.js в production
- Включено сжатие и удален X-Powered-By header

## [0.1.0] - 2025-12-17

### Добавлено
- Первоначальная версия приложения
- Пользовательская авторизация по ФИО
- Случайный выбор темы из пула (easy/hard)
- Возможность предложить свою идею
- Админ-панель для модерации идей
- Просмотр списка пользователей и их статусов
- Файловое хранилище данных (state.json)
- Таймер на 14 дней после выбора темы
- Взаимоисключающие сценарии (random vs own)

[Unreleased]: https://github.com/yourusername/vibe-wheel/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/vibe-wheel/releases/tag/v0.1.0
