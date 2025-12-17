// POST /api/spin - случайная тема из предзаготовленного пула (без LLM)

import { NextRequest, NextResponse } from "next/server";
import { getUser, readState, writeState, normalizeFio } from "@/lib/storage";
import fs from "fs/promises";
import path from "path";

interface Topic {
  id: string;
  title: string;
  description: string;
  acceptance_criteria: string;
}

// Загрузка пула тем
async function loadTopics(level: string): Promise<Topic[]> {
  const filename = level === "experienced" ? "topics_hard.json" : "topics_easy.json";
  const filePath = path.join(process.cwd(), "data", filename);
  const data = await fs.readFile(filePath, "utf-8");
  return JSON.parse(data) as Topic[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fio } = body;

    // Валидация
    if (!fio || typeof fio !== "string" || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "ФИО обязательно для заполнения" },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await getUser(fio);

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден. Сначала выполните /api/login" },
        { status: 404 }
      );
    }

    // Проверяем, что пользователь ещё не выбрал тему
    if (user.topic) {
      return NextResponse.json(
        {
          error: "Тема уже закреплена",
          user,
        },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь не начал сценарий "own"
    if (user.flow === "own") {
      return NextResponse.json(
        {
          error: "Вы уже выбрали сценарий 'Своя тема'. Невозможно крутить колесо.",
        },
        { status: 400 }
      );
    }

    // Читаем состояние атомарно
    const state = await readState();

    // Инициализируем usedTopics если не существует
    if (!state.usedTopics) {
      state.usedTopics = { easy: [], hard: [] };
    }

    // Загружаем пул тем
    const allTopics = await loadTopics(user.level);
    
    // Определяем используемый пул
    const poolKey = user.level === "experienced" ? "hard" : "easy";
    const usedTopicIds = state.usedTopics[poolKey] || [];

    // Находим неиспользованные темы
    const availableTopics = allTopics.filter(
      (topic) => !usedTopicIds.includes(topic.id)
    );

    // Если темы закончились
    if (availableTopics.length === 0) {
      return NextResponse.json(
        { 
          error: "Темы закончились, обратитесь к администратору",
          message: "Все темы из пула уже использованы. Пожалуйста, свяжитесь с администратором для добавления новых тем."
        },
        { status: 409 }
      );
    }

    // Выбираем случайную тему
    const randomIndex = Math.floor(Math.random() * availableTopics.length);
    const selectedTopic = availableTopics[randomIndex];

    // Формируем текст темы
    const topicText = `${selectedTopic.title}\n\n${selectedTopic.description}\n\nКритерии готовности: ${selectedTopic.acceptance_criteria}`;

    // Фиксируем тему и устанавливаем дедлайн (14 дней)
    const now = new Date();
    const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Атомарно обновляем состояние
    const userKey = normalizeFio(fio);
    state.users[userKey].flow = "random";
    state.users[userKey].topic = topicText;
    state.users[userKey].chosenAt = now.toISOString();
    state.users[userKey].deadlineAt = deadline.toISOString();

    // Помечаем тему как использованную
    state.usedTopics[poolKey].push(selectedTopic.id);

    // Атомарно сохраняем состояние
    await writeState(state);

    return NextResponse.json({
      success: true,
      topic: topicText,
      topicId: selectedTopic.id,
      deadline: deadline.toISOString(),
      message: "Тема успешно выбрана через колесо!",
      user: state.users[userKey],
    });
  } catch (error) {
    console.error("Error in /api/spin:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
