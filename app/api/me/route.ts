// GET /api/me - получение состояния пользователя

import { NextRequest, NextResponse } from "next/server";
import { getUser, getSubmissionByFio, readState, writeState, normalizeFio } from "@/lib/storage";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fio = searchParams.get("fio");

    // Валидация
    if (!fio || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр fio обязателен" },
        { status: 400 }
      );
    }

    // Получаем пользователя
    let user = await getUser(fio);

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    // Если тема закреплена, но таймер не установлен (утверждено администратором, но пользователь видит впервые)
    if (user.topic && !user.chosenAt && !user.deadlineAt) {
      const now = new Date();
      const deadline = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      // Устанавливаем таймер при первом просмотре
      const state = await readState();
      const userKey = normalizeFio(fio);
      state.users[userKey].chosenAt = now.toISOString();
      state.users[userKey].deadlineAt = deadline.toISOString();
      await writeState(state);
      
      // Обновляем локальную копию пользователя
      user = state.users[userKey];
    }

    // Рассчитываем оставшиеся дни, если тема закреплена
    let daysRemaining: number | null = null;
    if (user.deadlineAt) {
      const now = new Date();
      const deadline = new Date(user.deadlineAt);
      const diffMs = deadline.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }

    // Если тема уже закреплена (assignment exists)
    if (user.topic) {
      // Проверяем, есть ли approved submission с комментарием модератора
      const submission = await getSubmissionByFio(fio);
      const adminComment = submission?.status === "approved" ? submission.adminComment : undefined;

      return NextResponse.json({
        user,
        daysRemaining,
        status: "topic_selected",
        adminComment,
      });
    }

    // Если тема не закреплена, проверяем submission
    const submission = await getSubmissionByFio(fio);

    if (submission) {
      // Есть submission - возвращаем его статус
      if (submission.status === "pending") {
        return NextResponse.json({
          user,
          status: "pending",
          message: "Ваша идея на модерации. Ожидайте решения администратора.",
          submission: {
            id: submission.id,
            text: submission.text,
            status: submission.status,
            createdAt: submission.createdAt,
          },
        });
      }

      if (submission.status === "rejected") {
        return NextResponse.json({
          user,
          status: "rejected",
          message: "Ваша идея отклонена. Вы можете отправить исправленную версию.",
          submission: {
            id: submission.id,
            text: submission.text,
            status: submission.status,
            adminComment: submission.adminComment,
            updatedAt: submission.updatedAt,
          },
          canResubmit: true, // разрешаем отправить идею повторно
        });
      }

      if (submission.status === "approved") {
        // Approved, но тема почему-то не закреплена (не должно случиться)
        return NextResponse.json({
          user,
          status: "approved_pending_finalization",
          message: "Ваша идея одобрена, но тема ещё не закреплена. Обратитесь к администратору.",
          submission: {
            id: submission.id,
            text: submission.text,
            status: submission.status,
            approvedTopicText: submission.approvedTopicText,
            adminComment: submission.adminComment,
            updatedAt: submission.updatedAt,
          },
        });
      }
    }

    // Нет темы и нет submission - пользователь ещё выбирает путь
    return NextResponse.json({
      user,
      daysRemaining: null,
      status: "selecting",
    });
  } catch (error) {
    console.error("Error in /api/me:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
