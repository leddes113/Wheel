// POST /api/idea - своя тема через модерацию админом

import { NextRequest, NextResponse } from "next/server";
import { getUser, saveUser, createSubmission, getSubmissionByFio } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fio, idea } = body;

    // Валидация
    if (!fio || typeof fio !== "string" || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "ФИО обязательно для заполнения" },
        { status: 400 }
      );
    }

    if (!idea || typeof idea !== "string" || idea.trim().length === 0) {
      return NextResponse.json(
        { error: "Идея обязательна для заполнения" },
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

    // Проверяем, что пользователь ещё не выбрал тему (assignment)
    if (user.topic) {
      return NextResponse.json(
        {
          error: "Тема уже закреплена",
          user,
        },
        { status: 400 }
      );
    }

    // Проверяем, что пользователь не начал сценарий "random"
    if (user.flow === "random") {
      return NextResponse.json(
        {
          error: "Вы уже выбрали сценарий 'Случайная тема'. Невозможно предложить свою.",
        },
        { status: 400 }
      );
    }

    // Проверка минимальной длины идеи
    if (idea.trim().length < 20) {
      return NextResponse.json(
        {
          error: "Идея слишком короткая. Опишите вашу идею более подробно (минимум 20 символов).",
        },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже pending submission у пользователя
    const existingSubmission = await getSubmissionByFio(fio);
    
    if (existingSubmission && existingSubmission.status === "pending") {
      return NextResponse.json(
        {
          error: "У вас уже есть идея на модерации. Дождитесь решения администратора.",
          submission: existingSubmission,
        },
        { status: 400 }
      );
    }

    // Если был rejected submission, разрешаем отправить новый
    // (flow уже установлен в "own", так что random заблокирован)

    // Создаём submission со статусом pending
    const submission = await createSubmission(fio, idea.trim());

    // Устанавливаем flow="own" чтобы заблокировать random
    // НЕ устанавливаем topic - он будет установлен только после approve
    user.flow = "own";
    await saveUser(user);

    return NextResponse.json({
      success: true,
      status: "pending",
      message: "Идея отправлена на модерацию. Ожидайте решения администратора.",
      submission: {
        id: submission.id,
        text: submission.text,
        status: submission.status,
        createdAt: submission.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in /api/idea:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
