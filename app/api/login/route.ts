// POST /api/login - вход по ФИО + уровень

import { NextRequest, NextResponse } from "next/server";
import { getUser, saveUser } from "@/lib/storage";
import { UserLevel, UserState } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fio, level } = body;

    // Валидация входных данных
    if (!fio || typeof fio !== "string" || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "ФИО обязательно для заполнения" },
        { status: 400 }
      );
    }

    if (!level || (level !== "experienced" && level !== "beginner")) {
      return NextResponse.json(
        { error: "Уровень должен быть 'experienced' или 'beginner'" },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    const existingUser = await getUser(fio);

    if (existingUser) {
      // Пользователь уже существует, возвращаем его данные
      return NextResponse.json({
        user: existingUser,
        message: "Добро пожаловать обратно!",
      });
    }

    // Создаём нового пользователя
    const newUser: UserState = {
      fio: fio.trim(),
      level: level as UserLevel,
    };

    await saveUser(newUser);

    return NextResponse.json({
      user: newUser,
      message: "Пользователь успешно зарегистрирован",
    });
  } catch (error) {
    console.error("Error in /api/login:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

