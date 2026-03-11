// GET /api/admin/users - список пользователей (только для админов)

import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, deleteUser, normalizeFio } from "@/lib/storage";

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminFio = searchParams.get("adminFio");
    const userFio = searchParams.get("userFio");

    if (!adminFio || adminFio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр adminFio обязателен" },
        { status: 400 }
      );
    }

    if (!isAdmin(adminFio)) {
      return NextResponse.json(
        { error: "Доступ запрещен. У вас нет прав администратора." },
        { status: 403 }
      );
    }

    if (!userFio || userFio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр userFio обязателен" },
        { status: 400 }
      );
    }

    const result = await deleteUser(userFio);

    if (!result.deleted) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Пользователь ${userFio} удален`,
      topicFreed: result.topicFreed,
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fio = searchParams.get("fio");

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

    // Получаем пользователей (с опциональным фильтром по волне)
    const waveParam = searchParams.get("wave");
    const wave = waveParam ? parseInt(waveParam, 10) : undefined;
    const users = await getAllUsers(wave);

    // Добавляем вычисляемое поле daysLeft для каждого пользователя
    const usersWithDaysLeft = users.map(user => {
      let daysLeft: number | null = null;

      if (user.deadlineAt) {
        const now = new Date();
        const deadline = new Date(user.deadlineAt);
        const diffMs = deadline.getTime() - now.getTime();
        daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        ...user,
        daysLeft,
      };
    });

    // Сортируем по дате выбора темы (сначала новые)
    usersWithDaysLeft.sort((a, b) => {
      if (!a.chosenAt) return 1;
      if (!b.chosenAt) return -1;
      return new Date(b.chosenAt).getTime() - new Date(a.chosenAt).getTime();
    });

    return NextResponse.json({
      users: usersWithDaysLeft,
      total: usersWithDaysLeft.length,
    });
  } catch (error) {
    console.error("Error in /api/admin/users:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
