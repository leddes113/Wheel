// GET /api/admin/users - список пользователей (только для админов)
// DELETE /api/admin/users - удалить пользователя (только для админов)

import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, normalizeFio, deleteUser } from "@/lib/storage";

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

    // Получаем всех пользователей
    const users = await getAllUsers();

    // Добавляем вычисляемое поле daysLeft для каждого пользователя
    const usersWithDaysLeft = users.map(user => {
      let daysLeft: number | null = null;

      // Не считаем дни просрочки для завершивших задание
      if (user.deadlineAt && !user.completedAt) {
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminFio = searchParams.get("adminFio");
    const userFio = searchParams.get("userFio");

    // Проверка наличия параметров
    if (!adminFio || adminFio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр adminFio обязателен" },
        { status: 400 }
      );
    }

    if (!userFio || userFio.trim().length === 0) {
      return NextResponse.json(
        { error: "Параметр userFio обязателен" },
        { status: 400 }
      );
    }

    // Проверка прав доступа
    if (!isAdmin(adminFio)) {
      return NextResponse.json(
        { error: "Доступ запрещен. У вас нет прав администратора." },
        { status: 403 }
      );
    }

    // Удаляем пользователя
    const result = await deleteUser(userFio);

    return NextResponse.json({
      success: true,
      message: `Пользователь ${result.deletedUser.fio} успешно удален`,
      topicFreed: result.topicFreed,
      deletedUser: result.deletedUser,
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users:", error);
    
    if (error instanceof Error && error.message === "Пользователь не найден") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}

