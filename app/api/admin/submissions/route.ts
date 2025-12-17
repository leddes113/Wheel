// GET /api/admin/submissions - список submissions (только для админов)

import { NextRequest, NextResponse } from "next/server";
import { getAllSubmissions, normalizeFio } from "@/lib/storage";

// Проверка, является ли пользователь админом
function isAdmin(fio: string): boolean {
  const allowlist = process.env.ADMIN_ALLOWLIST || "";
  
  if (!allowlist) {
    return false;
  }

  // Разделяем по ; и нормализуем каждое ФИО
  const adminList = allowlist
    .split(";")
    .map(name => normalizeFio(name));

  const normalizedFio = normalizeFio(fio);

  return adminList.includes(normalizedFio);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fio = searchParams.get("fio");
    const statusFilter = searchParams.get("status") as "pending" | "approved" | "rejected" | null;

    // Проверка наличия fio параметра
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

    // Получаем submissions с опциональным фильтром по статусу
    const submissions = await getAllSubmissions(
      statusFilter || undefined
    );

    // Сортируем по дате создания (сначала новые)
    submissions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      submissions,
      total: submissions.length,
    });
  } catch (error) {
    console.error("Error in /api/admin/submissions:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
