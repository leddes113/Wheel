// POST /api/complete - завершение задания пользователем

import { NextRequest, NextResponse } from "next/server";
import { getUser, saveUser, normalizeFio, readState } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fio, gitLink } = body;

    // Валидация
    if (!fio || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр fio обязателен" },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await getUser(fio);

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Проверяем, что у пользователя есть закреплённая тема
    if (!user.topic) {
      return NextResponse.json(
        { error: "У вас нет закреплённой темы" },
        { status: 400 }
      );
    }

    // Проверяем, не завершено ли уже задание
    if (user.completedAt) {
      return NextResponse.json(
        { error: "Задание уже завершено" },
        { status: 400 }
      );
    }

    // Обновляем данные пользователя
    const now = new Date().toISOString();
    const updatedUser = {
      ...user,
      completedAt: now,
      gitLink: gitLink?.trim() || undefined, // сохраняем ссылку, если она есть
    };

    await saveUser(updatedUser);

    return NextResponse.json({
      success: true,
      message: "Задание успешно завершено",
      user: updatedUser,
    });

  } catch (error) {
    console.error("Error in /api/complete:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
