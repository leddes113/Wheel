# ⚠️ Требуется перезапуск сервера

## Что было исправлено

Заменил **динамические импорты** на **статические импорты** в `lib/llm/index.ts`.

**Проблема:** Динамические импорты (`await import()`) могут вызывать ошибки в Next.js App Router.

**Решение:** Использование обычных импортов с условной логикой + автоматический fallback на mock при ошибке.

---

## Как перезапустить сервер

### Вариант 1: В текущем терминале

Нажмите `Ctrl+C` чтобы остановить сервер, затем:

```bash
npm run dev
```

### Вариант 2: Полный перезапуск

```bash
# Остановите сервер (Ctrl+C)
# Очистите кэш Next.js
rm -rf .next

# Запустите снова
npm run dev
```

---

## Проверка после перезапуска

1. Откройте http://localhost:3000
2. Войдите с любым ФИО и уровнем
3. Нажмите "Выбрать тему" (случайная тема)
4. Должна появиться тема из mock LLM

**Ожидаемый результат для beginner:**
- "Создать todolist с фильтрацией задач"
- "Разработать калькулятор с историей операций"
- или другие темы из списка для новичков

**Ожидаемый результат для experienced:**
- "Создать мини-фреймворк для роутинга на TypeScript"
- "Реализовать простой state manager с подпиской на изменения"
- или другие темы из списка для опытных

---

## Что изменилось в коде

### До (проблемный код):

```typescript
async function getLLMProvider() {
  if (USE_DEEPSEEK) {
    return await import("./deepseek");
  } else {
    return await import("../gigachat-mock");
  }
}
```

### После (исправленный код):

```typescript
import * as deepseekProvider from "./deepseek";
import * as mockProvider from "../gigachat-mock";

export async function generateRandomTopic(level: UserLevel): Promise<string> {
  try {
    if (USE_DEEPSEEK) {
      return await deepseekProvider.generateRandomTopic(level);
    } else {
      return await mockProvider.generateRandomTopic(level);
    }
  } catch (error) {
    console.error("Error:", error);
    // Fallback на mock при ошибке
    if (USE_DEEPSEEK) {
      return await mockProvider.generateRandomTopic(level);
    }
    throw error;
  }
}
```

---

## Дополнительные улучшения

✅ Добавлен автоматический **fallback на mock** при ошибке DeepSeek  
✅ Улучшено логирование ошибок (`console.error`)  
✅ Статические импорты работают надёжнее в Next.js

---

Если после перезапуска ошибка повторится, пожалуйста, скопируйте текст ошибки из консоли браузера (F12 → Console) или из терминала сервера.
