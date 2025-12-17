"use client";

import { useState, useEffect } from "react";

interface UserData {
  fio: string;
  level: "experienced" | "beginner";
  flow?: "random" | "own";
  topic?: string;
  chosenAt?: string;
  deadlineAt?: string;
  daysLeft: number | null;
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
  
  // Для модерации
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [editedTopicText, setEditedTopicText] = useState<Record<string, string>>({});
  const [moderatorComments, setModeratorComments] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    if (!adminFio.trim()) {
      setError("Введите ваше ФИО");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/users?fio=${encodeURIComponent(adminFio.trim())}`
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
      
      // Загружаем submissions
      await loadSubmissions();
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      const response = await fetch(
        `/api/admin/submissions?fio=${encodeURIComponent(adminFio.trim())}&status=pending`
      );

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const handleRefresh = async () => {
    if (!authenticated) return;

    setLoading(true);
    setError("");

    try {
      // Загружаем пользователей
      const usersResponse = await fetch(
        `/api/admin/users?fio=${encodeURIComponent(adminFio.trim())}`
      );

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Загружаем submissions
      await loadSubmissions();
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
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
            <strong>{submissions.length}</strong>
          </p>
        </div>
        <button onClick={handleRefresh} disabled={loading} className="btn-primary">
          {loading ? <><div className="custom-loader"></div> Обновление...</> : "Обновить"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {/* Секция модерации */}
      {submissions.length > 0 && (
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
                    <div className="moderation-helper-text">
                      Комментарий будет отправлен пользователю при отклонении идеи
                    </div>
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

      {/* Таблица пользователей */}
      <h2>Список пользователей</h2>
      {users.length === 0 ? (
        <div className="info">
          Пользователей пока нет. Они появятся после регистрации через главную страницу.
        </div>
      ) : (
        <div className="table-wrapper">
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
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={index} className={user.topic ? "" : "not-started"}>
                  <td className="user-fio">{user.fio}</td>
                  <td>{formatLevel(user.level)}</td>
                  <td>{formatFlow(user.flow)}</td>
                  <td className="user-topic">
                    {user.topic || <span className="muted">Не выбрана</span>}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
