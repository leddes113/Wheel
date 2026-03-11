"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import * as XLSX from "xlsx";

interface UserData {
  fio: string;
  level: "experienced" | "beginner";
  flow?: "random" | "own";
  topic?: string;
  chosenAt?: string;
  deadlineAt?: string;
  daysLeft: number | null;
  completedAt?: string;
  gitLink?: string;
}

interface Submission {
  id: string;
  fio: string;
  text: string;
  status: "pending" | "approved" | "rejected";
  adminComment?: string;
  approvedTopicText?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const [adminFio, setAdminFio] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [allEmployees, setAllEmployees] = useState<string[]>([]);
  const [currentWave, setCurrentWave] = useState<number>(1);
  const [selectedWave, setSelectedWave] = useState<number>(1);
  
  // Для модерации
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [editedTopicText, setEditedTopicText] = useState<Record<string, string>>({});
  const [moderatorComments, setModeratorComments] = useState<Record<string, string>>({});

  // Ref для синхронизации sticky скроллбара
  const tableWrapperRef = React.useRef<HTMLDivElement>(null);
  const stickyScrollRef = React.useRef<HTMLDivElement>(null);

  // Синхронизация sticky скроллбара с таблицей
  useEffect(() => {
    const tableWrapper = tableWrapperRef.current;
    const stickyScroll = stickyScrollRef.current;

    if (!tableWrapper || !stickyScroll || users.length === 0) return;

    // Функция для обновления позиции и размера sticky скроллбара
    const updateStickyScrollbar = () => {
      const rect = tableWrapper.getBoundingClientRect();
      const table = tableWrapper.querySelector('table');
      
      if (table) {
        // Устанавливаем позицию и ширину sticky скроллбара
        stickyScroll.style.left = `${rect.left}px`;
        stickyScroll.style.width = `${rect.width}px`;
        
        // Устанавливаем ширину контента
        const scrollContent = stickyScroll.querySelector('.scroll-content') as HTMLElement;
        if (scrollContent) {
          scrollContent.style.width = `${table.scrollWidth}px`;
        }
      }
    };

    const handleTableScroll = () => {
      stickyScroll.scrollLeft = tableWrapper.scrollLeft;
    };

    const handleStickyScroll = () => {
      tableWrapper.scrollLeft = stickyScroll.scrollLeft;
    };

    // Начальная установка
    updateStickyScrollbar();

    // Обновляем при изменении размера окна
    window.addEventListener('resize', updateStickyScrollbar);
    tableWrapper.addEventListener('scroll', handleTableScroll);
    stickyScroll.addEventListener('scroll', handleStickyScroll);

    return () => {
      window.removeEventListener('resize', updateStickyScrollbar);
      tableWrapper.removeEventListener('scroll', handleTableScroll);
      stickyScroll.removeEventListener('scroll', handleStickyScroll);
    };
  }, [users]);

  const handleLogin = async () => {
    if (!adminFio.trim()) {
      setError("Введите ваше ФИО");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Сначала узнаём текущую волну из employees endpoint
      let cw = 1;
      const empResponse = await fetch('/api/admin/employees');
      if (empResponse.ok) {
        const empData = await empResponse.json();
        cw = empData.currentWave || 1;
        setCurrentWave(cw);
        setSelectedWave(cw);
      }

      const response = await fetch(
        `/api/admin/users?fio=${encodeURIComponent(adminFio.trim())}&wave=${cw}`
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError("Доступ запрещен. У вас нет прав администратора.");
        } else {
          setError(data.error || "Ошибка загрузки данных");
        }
        setLoading(false);
        return;
      }

      setUsers(data.users || []);
      setAuthenticated(true);
      
      // Передаём wave напрямую, т.к. setState ещё не применился
      await loadSubmissions(cw);
      await loadEmployees(cw);
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (wave?: number) => {
    try {
      const w = wave ?? selectedWave;
      const response = await fetch(
        `/api/admin/submissions?fio=${encodeURIComponent(adminFio.trim())}&status=pending&wave=${w}`
      );

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const loadEmployees = async (wave?: number) => {
    try {
      const w = wave ?? selectedWave;
      const response = await fetch(`/api/admin/employees?wave=${w}`);
      if (response.ok) {
        const data = await response.json();
        setTotalEmployees(data.totalEmployees || 0);
        setAllEmployees(data.employees || []);
      }
    } catch (err) {
      console.error("Error loading employees:", err);
    }
  };

  const handleRefresh = async (wave?: number) => {
    if (!authenticated) return;

    setLoading(true);
    setError("");

    try {
      const w = wave ?? selectedWave;
      const usersResponse = await fetch(
        `/api/admin/users?fio=${encodeURIComponent(adminFio.trim())}&wave=${w}`
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      await loadSubmissions(w);
      await loadEmployees(w);
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userFio: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${userFio}?\n\nЭто действие необратимо.`)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/users?adminFio=${encodeURIComponent(adminFio.trim())}&userFio=${encodeURIComponent(userFio)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка удаления пользователя");
        setLoading(false);
        return;
      }

      await handleRefresh();
      const message = data.topicFreed
        ? `Пользователь ${userFio} удален. Его тема освобождена и доступна для других пользователей.`
        : `Пользователь ${userFio} удален.`;
      alert(message);
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    if (users.length === 0) {
      alert("Нет данных для экспорта");
      return;
    }

    try {
      // Подготовка данных для экспорта
      const exportData = users.map((user) => ({
        "ФИО": user.fio,
        "Уровень": formatLevel(user.level),
        "Сценарий": formatFlow(user.flow),
        "Тема": user.topic || "—",
        "Дата выбора": formatDate(user.chosenAt),
        "Дедлайн": formatDate(user.deadlineAt),
        "Дней осталось": user.daysLeft !== null ? user.daysLeft : "—",
        "Завершено": user.completedAt ? "Да" : "—",
        "Дата завершения": formatDate(user.completedAt),
        "Git ссылка": user.gitLink || "—",
      }));

      // Создание рабочей книги
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Пользователи");

      // Установка ширины колонок
      const columnWidths = [
        { wch: 30 }, // ФИО
        { wch: 12 }, // Уровень
        { wch: 12 }, // Сценарий
        { wch: 60 }, // Тема
        { wch: 18 }, // Дата выбора
        { wch: 18 }, // Дедлайн
        { wch: 15 }, // Дней осталось
        { wch: 12 }, // Завершено
        { wch: 18 }, // Дата завершения
        { wch: 40 }, // Git ссылка
      ];
      worksheet["!cols"] = columnWidths;

      // Генерация имени файла с датой
      const date = new Date();
      const dateString = date.toISOString().split("T")[0];
      const timeString = date.toTimeString().split(" ")[0].replace(/:/g, "-");
      const filename = `users_export_${dateString}_${timeString}.xlsx`;

      // Сохранение файла
      XLSX.writeFile(workbook, filename);

      alert(`Данные успешно экспортированы в файл ${filename}`);
    } catch (err) {
      console.error("Error exporting to Excel:", err);
      setError("Ошибка экспорта данных");
    }
  };

  const handleApprove = async (submissionId: string, originalText: string) => {
    if (!confirm("Утвердить эту идею?")) return;

    setLoading(true);
    setError("");

    const topicText = editedTopicText[submissionId]?.trim() || originalText.trim();
    const comment = moderatorComments[submissionId]?.trim();

    try {
      const response = await fetch(
        `/api/admin/submissions/${submissionId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fio: adminFio.trim(),
            approvedTopicText: topicText,
            adminComment: comment || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка утверждения идеи");
        setLoading(false);
        return;
      }

      // Обновляем данные
      setEditingSubmission(null);
      setEditedTopicText((prev) => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      setModeratorComments((prev) => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      await handleRefresh();
      alert("Идея успешно утверждена!");
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (submissionId: string) => {
    const comment = moderatorComments[submissionId]?.trim();
    if (!comment) {
      setError("Комментарий модератора обязателен при отклонении идеи");
      return;
    }

    if (!confirm("Отклонить эту идею?")) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/submissions/${submissionId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fio: adminFio.trim(),
            adminComment: comment,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка отклонения идеи");
        setLoading(false);
        return;
      }

      // Обновляем данные
      setEditedTopicText((prev) => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      setModeratorComments((prev) => {
        const newState = { ...prev };
        delete newState[submissionId];
        return newState;
      });
      await handleRefresh();
      alert("Идея отклонена. Пользователь получит уведомление.");
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const initializeSubmissionFields = (submissionId: string, originalText: string) => {
    setEditedTopicText((prev) => ({
      ...prev,
      [submissionId]: prev[submissionId] ?? originalText,
    }));
    setModeratorComments((prev) => ({
      ...prev,
      [submissionId]: prev[submissionId] ?? "",
    }));
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLevel = (level: string): string => {
    return level === "experienced" ? "С опытом" : "Без опыта";
  };

  const formatFlow = (flow?: string): string => {
    if (!flow) return "—";
    return flow === "random" ? "Случайная" : "Своя";
  };

  // Расчёт статистики
  const calculateStats = () => {
    if (users.length === 0) return null;

    // Функция извлечения фамилии из ФИО
    const extractLastName = (fio: string) => {
      const normalized = fio.trim().toLowerCase();
      const parts = normalized.split(/\s+/);
      return parts[0] || ''; // Первое слово = фамилия
    };

    // Фамилии зарегистрированных пользователей
    const registeredLastNames = users.map(u => extractLastName(u.fio));

    // Метрики на основе полного списка сотрудников
    const registeredCount = users.length;
    const registeredPercent = totalEmployees > 0 
      ? ((registeredCount / totalEmployees) * 100).toFixed(1)
      : "0";

    // Пользователи, выбравшие тему
    const usersWithTopic = users.filter(u => u.topic);
    const chosenTopicCount = usersWithTopic.length;
    const chosenTopicPercent = totalEmployees > 0
      ? ((chosenTopicCount / totalEmployees) * 100).toFixed(1)
      : "0";

    // Сотрудники, не приступившие к заданию (не зарегистрированные) - сравниваем по фамилиям
    const notStartedEmployees = allEmployees.filter(
      emp => !registeredLastNames.includes(extractLastName(emp))
    );

    // Зарегистрировались, но не выбрали тему
    const registeredNoTopicEmployees = users.filter(u => !u.topic).map(u => u.fio);

    // 1. Процентное соотношение experienced/beginner
    const experiencedCount = users.filter(u => u.level === "experienced").length;
    const beginnerCount = users.filter(u => u.level === "beginner").length;
    const experiencedPercent = users.length > 0
      ? ((experiencedCount / users.length) * 100).toFixed(1)
      : "0";
    const beginnerPercent = users.length > 0
      ? ((beginnerCount / users.length) * 100).toFixed(1)
      : "0";

    // 2. Сколько beginners дошли до работающего решения (завершили задание)
    const beginnersCompleted = users.filter(u => 
      u.level === "beginner" && u.completedAt
    ).length;

    // 3. Число пользователей, завершивших задание в срок
    const completedOnTime = users.filter(u => {
      if (!u.completedAt || !u.deadlineAt) return false;
      return new Date(u.completedAt) <= new Date(u.deadlineAt);
    }).length;

    // 4. Число пользователей, не завершивших задания в срок (дедлайн прошёл, но не завершили)
    const now = new Date();
    const overdueNotCompleted = users.filter(u => {
      if (!u.deadlineAt || u.completedAt) return false;
      return new Date(u.deadlineAt) < now;
    }).length;

    // 5. Число пользователей со своими темами/случайными темами
    const ownTopicCount = users.filter(u => u.flow === "own").length;
    const randomTopicCount = users.filter(u => u.flow === "random").length;

    // 6. Среднее время выполнения для завершивших задание
    const completedUsers = users.filter(u => u.completedAt && u.chosenAt);
    const completionTimes = completedUsers.map(u => {
      const start = new Date(u.chosenAt!).getTime();
      const end = new Date(u.completedAt!).getTime();
      return (end - start) / (1000 * 60 * 60 * 24); // в днях
    });
    const avgCompletionDays = completionTimes.length > 0
      ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1)
      : "—";

    // 7. Число пользователей с готовыми проектами (<1 дня)
    const fastCompletions = completionTimes.filter(days => days < 1).length;

    // 8. Распределение по дням выполнения (исключаем < 1 дня)
    const completionDistribution: Record<number, number> = {};
    completionTimes.filter(days => days >= 1).forEach(days => {
      const dayBucket = Math.floor(days);
      completionDistribution[dayBucket] = (completionDistribution[dayBucket] || 0) + 1;
    });

    // 9. Список двоечников
    const failedEmployees: Array<{fio: string, reason: string}> = [];
    
    // Не зарегистрировались вообще
    notStartedEmployees.forEach(fio => {
      failedEmployees.push({ fio, reason: 'не зарегистрировался' });
    });
    
    // Зарегистрировались, но не выбрали тему
    registeredNoTopicEmployees.forEach(fio => {
      failedEmployees.push({ fio, reason: 'не выбрал тему' });
    });
    
    // Не завершили за 2 недели (14 дней) или не завершили вообще
    users.forEach(user => {
      if (user.chosenAt) {
        const daysPassed = (now.getTime() - new Date(user.chosenAt).getTime()) / (1000 * 60 * 60 * 24);
        
        if (!user.completedAt && daysPassed > 14) {
          // Не завершили вообще, прошло больше 14 дней
          failedEmployees.push({ fio: user.fio, reason: 'не завершил за 2 недели' });
        } else if (user.completedAt) {
          const completionDays = (new Date(user.completedAt).getTime() - new Date(user.chosenAt).getTime()) / (1000 * 60 * 60 * 24);
          if (completionDays > 14) {
            // Завершил, но позже чем за 14 дней
            failedEmployees.push({ fio: user.fio, reason: `завершил за ${Math.floor(completionDays)} дней` });
          }
        }
      }
    });

    return {
      // Общие метрики по управлению
      totalEmployees,
      registeredCount,
      registeredPercent,
      chosenTopicCount,
      chosenTopicPercent,
      notStartedEmployees,
      registeredNoTopicEmployees,
      
      // Метрики по пользователям
      totalUsers: users.length,
      experiencedCount,
      beginnerCount,
      experiencedPercent,
      beginnerPercent,
      beginnersCompleted,
      completedOnTime,
      overdueNotCompleted,
      ownTopicCount,
      randomTopicCount,
      avgCompletionDays,
      fastCompletions,
      totalCompleted: completedUsers.length,
      completionDistribution,
      failedEmployees,
    };
  };

  const stats = calculateStats();

  // Экран авторизации
  if (!authenticated) {
    return (
      <div className="container">
        <h1>Админ-кабинет</h1>
        <p>Введите ваше ФИО для доступа к панели администратора</p>

        <div className="form">
          <label>
            ФИО администратора:
            <input
              type="text"
              value={adminFio}
              onChange={(e) => setAdminFio(e.target.value)}
              placeholder="Иванов Иван Иванович"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLogin();
                }
              }}
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button onClick={handleLogin} disabled={loading} className="btn-primary">
            {loading ? <><div className="custom-loader"></div> Проверка...</> : "Войти"}
          </button>
        </div>
      </div>
    );
  }

  // Экран админки
  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Админ-кабинет</h1>
          <p className="admin-info">
            Администратор: <strong>{adminFio}</strong> | Пользователей:{" "}
            <strong>{users.length}</strong> | На модерации:{" "}
            <strong>{submissions.length}</strong> | Волна:{" "}
            <strong>{selectedWave}</strong>{selectedWave === currentWave ? " (текущая)" : " (архив)"}
          </p>
          {currentWave > 1 && (
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              {Array.from({ length: currentWave }, (_, i) => i + 1).map(w => (
                <button
                  key={w}
                  onClick={() => { setSelectedWave(w); handleRefresh(w); }}
                  className="btn-primary"
                  style={{
                    padding: '4px 14px',
                    fontSize: '0.85rem',
                    background: w === selectedWave ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                    border: w === selectedWave ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  Волна {w}{w === currentWave ? ' ●' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowStats(!showStats)} 
            className="btn-primary"
            style={{ background: showStats ? '#7c3aed' : 'var(--color-primary-accent)' }}
          >
            {showStats ? "← Назад к списку" : "Статистика"}
          </button>
          <button 
            onClick={handleExportToExcel} 
            disabled={loading || users.length === 0} 
            className="btn-primary"
            style={{ background: 'var(--color-secondary-accent)' }}
          >
            Экспорт в Excel
          </button>
          <button onClick={() => handleRefresh()} disabled={loading} className="btn-primary">
            {loading ? <><div className="custom-loader"></div> Обновление...</> : "Обновить"}
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Секция модерации */}
      {!showStats && submissions.length > 0 && (
        <div className="mb-xl">
          <h2>Модерация идей</h2>
          <div className="submissions-list">
            {submissions.map((submission) => {
              // Инициализируем поля при рендере
              if (editedTopicText[submission.id] === undefined) {
                initializeSubmissionFields(submission.id, submission.text);
              }

              return (
                <div key={submission.id} className="moderation-card">
                  {/* Заголовок карточки */}
                  <div className="moderation-card-header">
                    <div>
                      <strong>{submission.fio}</strong>
                      <span className="submission-date">
                        {formatDate(submission.createdAt)}
                      </span>
                    </div>
                    <span className="submission-status pending">На модерации</span>
                  </div>

                  {/* Секция 1: Исходная идея */}
                  <div className="moderation-section">
                    <label className="moderation-label">
                      Исходная идея пользователя
                    </label>
                    <div className="moderation-readonly-field">
                      {submission.text}
                    </div>
                  </div>

                  {/* Секция 2: Утвержденная формулировка */}
                  <div className="moderation-section">
                    <label className="moderation-label" htmlFor={`approved-text-${submission.id}`}>
                      Утвержденная формулировка
                    </label>
                    <textarea
                      id={`approved-text-${submission.id}`}
                      className="moderation-textarea"
                      value={editedTopicText[submission.id] || ""}
                      onChange={(e) =>
                        setEditedTopicText((prev) => ({
                          ...prev,
                          [submission.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Отредактируйте формулировку темы при необходимости"
                      disabled={loading}
                    />
                    <div className="moderation-helper-text">
                      Эта формулировка будет отправлена пользователю после утверждения
                    </div>
                  </div>

                  {/* Секция 3: Комментарий модератора */}
                  <div className="moderation-section">
                    <label className="moderation-label" htmlFor={`comment-${submission.id}`}>
                      Комментарий модератора
                      <span className="moderation-label-optional">(при отклонении — обязателен)</span>
                    </label>
                    <textarea
                      id={`comment-${submission.id}`}
                      className="moderation-textarea"
                      value={moderatorComments[submission.id] || ""}
                      onChange={(e) =>
                        setModeratorComments((prev) => ({
                          ...prev,
                          [submission.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Укажите причину отклонения или дополнительные пожелания"
                      disabled={loading}
                    />
                  </div>

                  {/* Секция 4: Действия */}
                  <div className="moderation-actions">
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(submission.id, submission.text)}
                      disabled={loading}
                    >
                      Утвердить
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => handleReject(submission.id)}
                      disabled={loading}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Статистика */}
      {showStats && stats && (
        <div className="mb-xl">
          <h2>Статистика активности</h2>

          {/* Общие метрики по управлению */}
          {totalEmployees > 0 && (
            <>
              <div className="stats-section-header">
                <span className="stats-section-icon">📊</span>
                <h3>Общая вовлеченность управления</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '2rem' }}>
                {/* Всего сотрудников */}
                <div className="stat-card">
                  <h3>👥 Всего сотрудников</h3>
                  <div className="stat-value">{stats.totalEmployees}</div>
                  <div className="stat-label">в управлении</div>
                </div>

                {/* Зарегистрировались */}
                <div className="stat-card">
                  <h3>✅ Зарегистрировались</h3>
                  <div className="stat-value">{stats.registeredCount}</div>
                  <div className="stat-label">{stats.registeredPercent}% от управления</div>
                  <div className="stat-details">
                    Не зарегались: {stats.notStartedEmployees.length} чел.
                  </div>
                </div>

                {/* Выполнили задание */}
                <div className="stat-card">
                  <h3>🎯 Выполнили задание</h3>
                  <div className="stat-value">{stats.totalCompleted}</div>
                  <div className="stat-label">пользователей</div>
                  <div className="stat-details">
                    {totalEmployees > 0 
                      ? `${((stats.totalCompleted / totalEmployees) * 100).toFixed(1)}% от управления`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* КЛЮЧЕВЫЕ МЕТРИКИ - после метрик управления */}
              <div style={{ marginTop: '2rem', marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div className="stat-card stat-card-key">
                  <h3>🚀 Новички создали своё приложение</h3>
                  <div className="stat-value">{stats.beginnersCompleted}</div>
                  <div className="stat-label">из {stats.beginnerCount} без опыта в разработке</div>
                  <div className="stat-details">
                    {stats.beginnerCount > 0 
                      ? `🎯 ${((stats.beginnersCompleted / stats.beginnerCount) * 100).toFixed(1)}% успеха среди новичков`
                      : '—'}
                  </div>
                </div>

                {/* Двоечники */}
                {stats.failedEmployees.length > 0 && (
                  <div className="stat-card stat-card-warning">
                    <h3>⚠️ Не выполнили</h3>
                    <div className="stat-value">{stats.failedEmployees.length}</div>
                    <div className="stat-label">сотрудников</div>
                    <div className="stat-details">
                      Не зарегистрировались / не выбрали тему / не выполнили за 2 недели
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="stats-section-header">
            <span className="stats-section-icon">📈</span>
            <h3>Детальная статистика участников</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Соотношение опыта */}
            <div className="stat-card">
              <h3>💼 Опыт в разработке</h3>
              <div className="stat-value">{stats.experiencedCount} / {stats.beginnerCount}</div>
              <div className="stat-label">Имеют опыт / Не имеют опыт</div>
              <div className="stat-details">
                {stats.experiencedPercent}% с опытом | {stats.beginnerPercent}% без опыта
              </div>
            </div>


            {/* Завершили в срок */}
            <div className="stat-card">
              <h3>✔️ Завершили в срок</h3>
              <div className="stat-value">{stats.completedOnTime}</div>
              <div className="stat-label">пользователей</div>
              <div className="stat-details">
                📊 Всего завершено: {stats.totalCompleted}
              </div>
            </div>

            {/* Просрочили */}
            <div className="stat-card">
              <h3>⏰ Не завершили в срок</h3>
              <div className="stat-value">{stats.overdueNotCompleted}</div>
              <div className="stat-label">пользователей просрочили</div>
              <div className="stat-details">
                Дедлайн прошёл, но не завершено
              </div>
            </div>

            {/* Свои/Случайные темы */}
            <div className="stat-card">
              <h3>🎲 Выбор темы</h3>
              <div className="stat-value">{stats.ownTopicCount} / {stats.randomTopicCount}</div>
              <div className="stat-label">Своя тема / Случайная</div>
              <div className="stat-details">
                Всего выбрали: {stats.ownTopicCount + stats.randomTopicCount}
              </div>
            </div>

            {/* Среднее время выполнения */}
            <div className="stat-card">
              <h3>⏱️ Среднее время</h3>
              <div className="stat-value">{stats.avgCompletionDays}</div>
              <div className="stat-label">дней на выполнение</div>
              <div className="stat-details">
                Для {stats.totalCompleted} завершивших
              </div>
            </div>

            {/* Практиковали vibecoding до старта */}
            <div className="stat-card">
              <h3>⚡ Vibecoding до активности</h3>
              <div className="stat-value">{stats.fastCompletions}</div>
              <div className="stat-label">пользователей</div>
              <div className="stat-details">
                Практиковали vibecoding ещё до старта активности
              </div>
            </div>
          </div>

          {/* График распределения по дням */}
          {stats.totalCompleted > 0 && (
            <>
              <div className="stats-section-header">
                <span className="stats-section-icon">📊</span>
                <h3>Распределение по времени выполнения</h3>
              </div>
              <div className="completion-chart">
                <div className="chart-container">
                  {Object.keys(stats.completionDistribution)
                    .sort((a, b) => Number(a) - Number(b))
                    .map(day => {
                      const dayNum = Number(day);
                      const count = stats.completionDistribution[dayNum];
                      const maxCount = Math.max(...Object.values(stats.completionDistribution));
                      const heightPercent = (count / maxCount) * 100;
                      
                      return (
                        <div key={day} className="chart-bar-wrapper">
                          <div className="chart-bar-container">
                            <div 
                              className="chart-bar" 
                              style={{ height: `${heightPercent}%` }}
                              title={`${count} чел. за ${dayNum} дней`}
                            >
                              <span className="chart-bar-value">{count}</span>
                            </div>
                          </div>
                          <div className="chart-bar-label">
                            {dayNum === 0 ? '<1' : dayNum} {dayNum === 1 ? 'день' : dayNum < 5 ? 'дня' : 'дней'}
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="chart-footer">
                  <p>Количество пользователей по количеству дней на завершение задания</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Таблица пользователей */}
      {!showStats && <h2>Список пользователей</h2>}
      {!showStats && users.length === 0 ? (
        <div className="info">
          Пользователей пока нет. Они появятся после регистрации через главную страницу.
        </div>
      ) : !showStats ? (
        <>
          <div className="table-wrapper" ref={tableWrapperRef}>
            <table className="admin-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Уровень</th>
                <th>Сценарий</th>
                <th>Тема</th>
                <th>Дата выбора</th>
                <th>Дедлайн</th>
                <th>Дней осталось</th>
                <th>✓ Завершено</th>
                <th>Дата завершения</th>
                <th>Git ссылка</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={index} className={user.topic ? "" : "not-started"}>
                  <td className="user-fio">{user.fio}</td>
                  <td>{formatLevel(user.level)}</td>
                  <td>{formatFlow(user.flow)}</td>
                  <td className="user-topic">
                    {user.topic ? (
                      user.flow === "random" ? (
                        <span title={user.topic}>{user.topic.split('\n\n')[0]}</span>
                      ) : (
                        user.topic
                      )
                    ) : (
                      <span className="muted">Не выбрана</span>
                    )}
                  </td>
                  <td>{formatDate(user.chosenAt)}</td>
                  <td>{formatDate(user.deadlineAt)}</td>
                  <td className="days-left">
                    {user.daysLeft !== null ? (
                      <span
                        className={
                          user.daysLeft <= 3
                            ? "urgent"
                            : user.daysLeft <= 7
                            ? "warning"
                            : ""
                        }
                      >
                        {user.daysLeft}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '1.5rem' }}>
                    {user.completedAt ? (
                      <span style={{ color: 'var(--color-secondary-accent)' }} title="Задание завершено">
                        ✓
                      </span>
                    ) : user.topic ? (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>—</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {user.completedAt ? (
                      formatDate(user.completedAt)
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {user.gitLink ? (
                      <a 
                        href={user.gitLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-secondary-accent)', textDecoration: 'underline' }}
                      >
                        Репозиторий
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDeleteUser(user.fio)}
                      disabled={loading}
                      className="btn-reject"
                      style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
                      title="Удалить пользователя"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Sticky скроллбар внизу экрана */}
        <div 
          ref={stickyScrollRef}
          style={{
            position: 'fixed',
            bottom: 0,
            height: '20px',
            overflowX: 'auto',
            overflowY: 'hidden',
            background: 'transparent',
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
          className="sticky-scrollbar"
        >
          <div className="scroll-content" style={{ height: '1px', pointerEvents: 'none' }}></div>
        </div>
        </>
      ) : null}
    </div>
  );
}
