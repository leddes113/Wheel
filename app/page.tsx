"use client";

import { useState, useEffect } from "react";

type UserLevel = "experienced" | "beginner";
type FlowType = "random" | "own";
type Screen = "login" | "choose_flow" | "random_warning" | "own_idea" | "topic_selected" | "moderation_pending" | "moderation_rejected";

interface UserState {
  fio: string;
  level: UserLevel;
  flow?: FlowType;
  topic?: string;
  chosenAt?: string;
  deadlineAt?: string;
  originalIdea?: string;
}

interface SubmissionInfo {
  id: string;
  text: string;
  status: string;
  adminComment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [fio, setFio] = useState("");
  const [level, setLevel] = useState<UserLevel>("beginner");
  const [user, setUser] = useState<UserState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Для экрана own_idea
  const [ideaText, setIdeaText] = useState("");
  
  // Для модерации
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Для финального экрана
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  // Флаг первоначальной загрузки
  const [initializing, setInitializing] = useState(true);

  // Восстановление состояния пользователя при загрузке страницы
  useEffect(() => {
    const restoreUserState = async () => {
      const savedFio = localStorage.getItem("vibe_wheel_fio");
      if (!savedFio) {
        setInitializing(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/me?fio=${encodeURIComponent(savedFio)}`);
        if (!response.ok) {
          // Пользователь не найден, очищаем localStorage
          localStorage.removeItem("vibe_wheel_fio");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setFio(savedFio);

        // Тема уже закреплена
        if (data.user && data.user.topic) {
          setUser(data.user);
          setDaysRemaining(data.daysRemaining);
          setScreen("topic_selected");
          setLoading(false);
          setInitializing(false);
          return;
        }

        // Submission на модерации
        if (data.status === "pending" && data.submission) {
          setUser(data.user);
          setSubmission(data.submission);
          setScreen("moderation_pending");
          setLoading(false);
          setInitializing(false);
          return;
        }

        // Submission отклонен
        if (data.status === "rejected" && data.submission) {
          setUser(data.user);
          setSubmission(data.submission);
          setIdeaText(data.submission.text);
          setScreen("moderation_rejected");
          setLoading(false);
          setInitializing(false);
          return;
        }

        // Пользователь есть, но тема не выбрана
        if (data.user) {
          setUser(data.user);
          setScreen("choose_flow");
          setLoading(false);
          setInitializing(false);
          return;
        }
      } catch (err) {
        console.error("Error restoring user state:", err);
        localStorage.removeItem("vibe_wheel_fio");
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    };

    restoreUserState();
  }, []);

  // Проверка существующего пользователя при вводе ФИО
  useEffect(() => {
    const checkExistingUser = async () => {
      if (fio.trim().length < 3) return;

      try {
        const response = await fetch(`/api/me?fio=${encodeURIComponent(fio.trim())}`);
        if (response.ok) {
          const data = await response.json();
          
          // Тема уже закреплена
          if (data.user && data.user.topic) {
            setUser(data.user);
            setDaysRemaining(data.daysRemaining);
            setScreen("topic_selected");
            return;
          }
          
          // Submission на модерации (pending)
          if (data.status === "pending" && data.submission) {
            setUser(data.user);
            setSubmission(data.submission);
            setScreen("moderation_pending");
            return;
          }
          
          // Submission отклонен (rejected)
          if (data.status === "rejected" && data.submission) {
            setUser(data.user);
            setSubmission(data.submission);
            setIdeaText(data.submission.text); // Предзаполняем прошлую идею
            setScreen("moderation_rejected");
            return;
          }
        }
      } catch (err) {
        // Игнорируем ошибки при проверке
      }
    };

    const timeoutId = setTimeout(checkExistingUser, 500);
    return () => clearTimeout(timeoutId);
  }, [fio]);

  // Логин
  const handleLogin = async () => {
    if (!fio.trim()) {
      setError("Введите ФИО");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fio: fio.trim(), level }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка входа");
        setLoading(false);
        return;
      }

      setUser(data.user);
      
      // Сохраняем ФИО в localStorage для восстановления после перезагрузки
      localStorage.setItem("vibe_wheel_fio", fio.trim());

      // Проверяем статус через /api/me
      const meResponse = await fetch(`/api/me?fio=${encodeURIComponent(fio.trim())}`);
      const meData = await meResponse.json();

      // Тема уже закреплена
      if (meData.user && meData.user.topic) {
        setDaysRemaining(meData.daysRemaining);
        setScreen("topic_selected");
        return;
      }

      // Submission на модерации
      if (meData.status === "pending" && meData.submission) {
        setSubmission(meData.submission);
        setScreen("moderation_pending");
        return;
      }

      // Submission отклонен
      if (meData.status === "rejected" && meData.submission) {
        setSubmission(meData.submission);
        setIdeaText(meData.submission.text);
        setScreen("moderation_rejected");
        return;
      }

      // Нет темы и нет submission - выбор сценария
      setScreen("choose_flow");
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  // Генерация случайной темы (с фиксацией)
  const handleGenerateTopic = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fio: user.fio }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка генерации темы");
        setLoading(false);
        return;
      }

      // Тема зафиксирована на сервере, сохраняем в стейт и переходим на финальный экран
      setUser(data.user);
      setDaysRemaining(14);
      setScreen("topic_selected");
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  // Отправка своей идеи на модерацию
  const handleSubmitIdea = async () => {
    if (!user) return;
    if (!ideaText.trim()) {
      setError("Введите вашу идею");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fio: user.fio, idea: ideaText }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка отправки идеи");
        setLoading(false);
        return;
      }

      // Идея отправлена на модерацию
      if (data.status === "pending" && data.submission) {
        setSubmission(data.submission);
        setScreen("moderation_pending");
      }
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  // Выход из системы
  const handleLogout = () => {
    localStorage.removeItem("vibe_wheel_fio");
    setUser(null);
    setFio("");
    setLevel("beginner");
    setSubmission(null);
    setIdeaText("");
    setDaysRemaining(null);
    setError("");
    setScreen("login");
  };

  // Проверка статуса submission без перезагрузки страницы
  const handleCheckStatus = async () => {
    if (!user) return;

    setCheckingStatus(true);
    setError("");

    try {
      const response = await fetch(`/api/me?fio=${encodeURIComponent(user.fio)}`);
      const data = await response.json();

      if (!response.ok) {
        setError("Ошибка проверки статуса");
        setCheckingStatus(false);
        return;
      }

      // Тема утверждена
      if (data.user && data.user.topic) {
        setUser(data.user);
        setDaysRemaining(data.daysRemaining);
        setSubmission(null);
        setScreen("topic_selected");
        return;
      }

      // Идея отклонена
      if (data.status === "rejected" && data.submission) {
        setSubmission(data.submission);
        setIdeaText(data.submission.text);
        setScreen("moderation_rejected");
        return;
      }

      // Всё ещё на модерации
      if (data.status === "pending" && data.submission) {
        setSubmission(data.submission);
        // Остаёмся на том же экране
      }
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setCheckingStatus(false);
    }
  };

  // Экран загрузки при инициализации
  if (initializing) {
    return (
      <div className="container">
        <h1>Загрузка...</h1>
        <p>Пожалуйста, подождите</p>
      </div>
    );
  }

  // Экран: Вход (ФИО + уровень)
  if (screen === "login") {
    return (
      <div className="container">
        <h1>Vibe Coding Wheel</h1>
        <div className="form">
          <label>
            ФИО:
            <input
              type="text"
              value={fio}
              onChange={(e) => setFio(e.target.value)}
              placeholder="Иванов Иван Иванович"
              disabled={loading}
            />
          </label>

          <label>
            Уровень подготовки:
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="beginner"
                  checked={level === "beginner"}
                  onChange={(e) => setLevel(e.target.value as UserLevel)}
                  disabled={loading}
                />
                У меня нет опыта в программировании
              </label>
              <label>
                <input
                  type="radio"
                  value="experienced"
                  checked={level === "experienced"}
                  onChange={(e) => setLevel(e.target.value as UserLevel)}
                  disabled={loading}
                />
                У меня есть опыт в программировании
              </label>
            </div>
          </label>

          {error && <div className="error">{error}</div>}

          <button onClick={handleLogin} disabled={loading}>
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </div>
      </div>
    );
  }

  // Экран: Выбор сценария
  if (screen === "choose_flow") {
    return (
      <div className="container">
        <h1>Выберите сценарий</h1>
        <p>Привет, {user?.fio}!</p>

        <div className="flow-buttons">
          <button
            onClick={() => setScreen("random_warning")}
            disabled={user?.flow === "own"}
          >
            Случайная тема
          </button>
          <button
            onClick={() => setScreen("own_idea")}
            disabled={user?.flow === "random"}
          >
            Своя тема
          </button>
        </div>

        {user?.flow === "own" && (
          <p className="info">Вы уже начали сценарий "Своя тема"</p>
        )}
        {user?.flow === "random" && (
          <p className="info">Вы уже начали сценарий "Случайная тема"</p>
        )}

        {error && <div className="error">{error}</div>}

        <button 
          onClick={handleLogout}
          style={{ marginTop: "20px", backgroundColor: "#6c757d" }}
        >
          Выйти
        </button>
      </div>
    );
  }

  // Экран: Предупреждение перед случайной темой
  if (screen === "random_warning") {
    return (
      <div className="container">
        <h1>Случайная тема</h1>
        
        <div className="result">
          <div className="warning-box">
            <p>⚠️ <strong>Внимание!</strong></p>
            <p>После выбора тему изменить нельзя.</p>
            <p>Вы уверены, что хотите получить случайную тему?</p>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="action-buttons">
            <button onClick={handleGenerateTopic} disabled={loading}>
              {loading ? "Генерация..." : "Да, выбрать случайную тему"}
            </button>
            <button onClick={() => setScreen("choose_flow")} disabled={loading}>
              Отменить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Экран: Своя тема
  if (screen === "own_idea") {
    return (
      <div className="container">
        <h1>Своя тема</h1>
        <p>Опишите идею вашего проекта (минимум 20 символов)</p>

        <div className="form">
          <textarea
            value={ideaText}
            onChange={(e) => setIdeaText(e.target.value)}
            placeholder="Например: Создать приложение для управления задачами с интеграцией календаря и напоминаниями"
            rows={5}
            disabled={loading}
          />

          {error && <div className="error">{error}</div>}

          <div className="action-buttons">
            <button onClick={handleSubmitIdea} disabled={loading}>
              {loading ? "Отправка..." : "Отправить на модерацию"}
            </button>
            <button onClick={() => setScreen("choose_flow")} disabled={loading}>
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Экран: Идея на модерации (pending)
  if (screen === "moderation_pending") {
    return (
      <div className="container">
        <h1>Идея на модерации ⏳</h1>
        
        <div className="result">
          <div className="info-box">
            <h3>Ваша идея:</h3>
            <div className="topic">{submission?.text}</div>
          </div>

          <div className="info-box">
            <p>
              Ваша идея отправлена на модерацию администратору. 
              Ожидайте решения. Вы получите уведомление после проверки.
            </p>
            <p className="small">
              Отправлено: {submission?.createdAt && new Date(submission.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="action-buttons">
            <button onClick={handleCheckStatus} disabled={checkingStatus}>
              {checkingStatus ? "Проверка..." : "Обновить статус"}
            </button>
            <button 
              onClick={handleLogout}
              style={{ backgroundColor: "#6c757d" }}
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Экран: Идея отклонена (rejected)
  if (screen === "moderation_rejected") {
    return (
      <div className="container">
        <h1>Идея отклонена ❌</h1>
        
        <div className="result">
          <div className="error-box">
            <h3>Комментарий администратора:</h3>
            <p>{submission?.adminComment || "Без комментария"}</p>
          </div>

          <div className="info-box">
            <h3>Ваша прошлая идея:</h3>
            <div className="topic">{submission?.text}</div>
          </div>

          <p>Вы можете отправить исправленную версию идеи:</p>

          <div className="form">
            <textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Исправьте вашу идею с учётом комментария"
              rows={5}
              disabled={loading}
            />

            {error && <div className="error">{error}</div>}

            <div className="action-buttons">
              <button onClick={handleSubmitIdea} disabled={loading}>
                {loading ? "Отправка..." : "Отправить исправленную идею"}
              </button>
              <button 
                onClick={handleLogout}
                style={{ backgroundColor: "#6c757d" }}
                disabled={loading}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Экран: Тема закреплена
  if (screen === "topic_selected" && user?.topic) {
    return (
      <div className="container">
        <h1>Тема закреплена! ✅</h1>

        <div className="result">
          <h2>Ваша тема:</h2>
          <div className="topic">{user.topic}</div>

          <div className="deadline">
            {user.deadlineAt && (
              <p>
                Дедлайн: <strong>{new Date(user.deadlineAt).toLocaleDateString("ru-RU")}</strong>
              </p>
            )}
            <p>
              Осталось дней: <strong>{daysRemaining ?? 0}</strong>
            </p>
          </div>

          <div className="good-luck">
            <h2>Good Luck, Have Fun! 🎉</h2>
          </div>

          <button 
            onClick={handleLogout} 
            style={{ marginTop: "20px", backgroundColor: "#6c757d" }}
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return null;
}
