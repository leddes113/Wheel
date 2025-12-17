// POST /api/admin/submissions/[id]/approve - утверждение идеи (только для админов)

import { NextRequest, NextResponse } from "next/server";
import { getSubmission, updateSubmission, getUser, normalizeFio, readState, writeState } from "@/lib/storage";

// Проверка, является ли пользователь админом
function isAdmin(fio: string): boolean {
  const allowlist = process.env.ADMIN_ALLOWLIST || "";
  
  if (!allowlist) {
    return false;
  }

  const adminList = allowlist
    .split(";")
    .map(name => normalizeFio(name));

  const normalizedFio = normalizeFio(fio);

  return adminList.includes(normalizedFio);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { fio, approvedTopicText, adminComment } = body;
    const resolvedParams = await params;
    const submissionId = resolvedParams.id;

    // Валидация
    if (!fio || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр fio обязателен" },
        { status: 400 }
      );
    }

    // Проверка прав доступа
    if (!isAdmin(fio)) {
      return NextResponse.json(
        { error: "Доступ запрещен. У вас нет прав администратора." },
        { status: 403 }
      );
    }

    // Получаем submission
    const submission = await getSubmission(submissionId);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission не найден" },
        { status: 404 }
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: `Submission уже обработан со статусом: ${submission.status}` },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await getUser(submission.fio);

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Проверяем, что у пользователя ещё нет закреплённой темы
    if (user.topic) {
      return NextResponse.json(
        { error: "У пользователя уже закреплена тема" },
        { status: 400 }
      );
    }

    // Определяем финальную формулировку темы
    const finalTopicText = approvedTopicText?.trim() || submission.text;

    // Не устанавливаем таймер сразу - он начнётся, когда пользователь увидит утверждение
    const now = new Date();

    // Атомарно обновляем submission и пользователя
    const state = await readState();

    // Обновляем submission
    submission.status = "approved";
    submission.approvedTopicText = finalTopicText;
    submission.adminComment = adminComment?.trim();
    submission.updatedAt = now.toISOString();
    state.submissions![submission.id] = submission;

    // Обновляем пользователя (НЕ устанавливаем chosenAt и deadlineAt - они установятся при первом просмотре)
    const userKey = normalizeFio(user.fio);
    state.users[userKey].topic = finalTopicText;
    state.users[userKey].originalIdea = submission.text;

    // Сохраняем атомарно
    await writeState(state);

    return NextResponse.json({
      success: true,
      message: "Идея успешно утверждена",
      submission: state.submissions![submission.id],
      user: state.users[userKey],
    });
  } catch (error) {
    console.error("Error in /api/admin/submissions/[id]/approve:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
