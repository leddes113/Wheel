// POST /api/admin/submissions/[id]/reject - отклонение идеи (только для админов)

import { NextRequest, NextResponse } from "next/server";
import { getSubmission, updateSubmission, normalizeFio } from "@/lib/storage";

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
    const { fio, adminComment } = body;
    const resolvedParams = await params;
    const submissionId = resolvedParams.id;

    // Валидация
    if (!fio || fio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр fio обязателен" },
        { status: 400 }
      );
    }

    if (!adminComment || adminComment.trim().length === 0) {
      return NextResponse.json(
        { error: "Комментарий администратора обязателен при отклонении" },
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

    // Обновляем submission
    submission.status = "rejected";
    submission.adminComment = adminComment.trim();

    await updateSubmission(submission);

    return NextResponse.json({
      success: true,
      message: "Идея отклонена. Пользователь может отправить исправленную версию.",
      submission,
    });
  } catch (error) {
    console.error("Error in /api/admin/submissions/[id]/reject:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
