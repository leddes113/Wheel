"use client";

import { useState, useEffect } from "react";
import TopicWheel from "./components/TopicWheel";

type UserLevel = "experienced" | "beginner";
type FlowType = "random" | "own";
type Screen = "login" | "choose_flow" | "random_warning" | "random_spinning" | "own_idea" | "topic_selected" | "moderation_pending" | "moderation_rejected";

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
  const [adminComment, setAdminComment] = useState<string | undefined>(undefined);

  // Флаг первоначальной загрузки
  const [initializing, setInitializing] = useState(true);

  // Для анимации колеса (Iteration B)
  const [spinResult, setSpinResult] = useState<{ user: UserState; error?: string } | null>(null);
  const [isWheelComplete, setIsWheelComplete] = useState(false);

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
          setAdminComment(data.adminComment);
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
            setAdminComment(data.adminComment);
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
        setAdminComment(meData.adminComment);
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

  // Генерация случайной темы (с фиксацией) — Iteration B
  const handleGenerateTopic = async () => {
    if (!user) return;

    setLoading(true);
    setError("");
    setSpinResult(null);
    setIsWheelComplete(false);

    // Переходим на экран с анимацией колеса
    setScreen("random_spinning");

    // Запускаем запрос к API параллельно с анимацией
    try {
      const response = await fetch("/api/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fio: user.fio }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Сохраняем ошибку, но показываем её только после завершения анимации
        setSpinResult({ user: user, error: data.error || "Ошибка генерации темы" });
      } else {
        // Сохраняем результат, но показываем его только после завершения анимации
        setSpinResult({ user: data.user });
        setDaysRemaining(14);
      }
    } catch (err) {
      setSpinResult({ user: user, error: "Ошибка соединения с сервером" });
    } finally {
      setLoading(false);
    }
  };

  // Колбэк, вызываемый после завершения анимации колеса
  const handleWheelComplete = () => {
    setIsWheelComplete(true);
  };

  // Эффект для показа результата после завершения анимации
  useEffect(() => {
    if (isWheelComplete && spinResult) {
      if (spinResult.error) {
        // Показываем ошибку и возвращаем на экран предупреждения
        setError(spinResult.error);
        setScreen("random_warning");
      } else {
        // Показываем финальную тему
        setUser(spinResult.user);
        setScreen("topic_selected");
      }
    }
  }, [isWheelComplete, spinResult]);

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
    setAdminComment(undefined);
    setError("");
    setScreen("login");
  };

  // Парсинг темы для структурированного отображения
  const parseTopicStructure = (topic: string) => {
    // Для random flow: "title\n\ndetails\n\nКритерии готовности: criteria"
    // Для own flow: просто текст
    
    const parts = topic.split('\n\n');
    
    if (parts.length >= 3 && parts[2].startsWith('Критерии готовности:')) {
      // Random flow
      return {
        title: parts[0],
        details: parts.slice(1, -1).join('\n\n') + '\n\n' + parts[parts.length - 1],
      };
    } else if (parts.length >= 2) {
      // Возможно own flow с несколькими параграфами
      return {
        title: parts[0],
        details: parts.slice(1).join('\n\n'),
      };
    } else {
      // Короткая тема без структуры
      return {
        title: topic.length > 100 ? topic.substring(0, 100) + '...' : topic,
        details: topic.length > 100 ? topic : '',
      };
    }
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
        setAdminComment(data.adminComment);
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
        <div className="loader-container">
          <div className="custom-loader"></div>
          <span className="loader-text">Загрузка приложения</span>
        </div>
      </div>
    );
  }

  // Экран: Вход (ФИО + уровень)
  if (screen === "login") {
    return (
      <div className="container">
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>Vibe Coding Wheel</h1>
        <p style={{ fontSize: "1.5rem", marginTop: "0.5rem", marginBottom: "3rem", opacity: 0.9 }}>Выберите свою идею для вайб-кодинга</p>
        
        <div className="form" style={{ marginTop: "2.5rem" }}>
          <label style={{ fontSize: "1.25rem", gap: "0.75rem" }}>
            ФИО:
            <input
              type="text"
              value={fio}
              onChange={(e) => setFio(e.target.value)}
              placeholder="Иванов Иван Иванович"
              disabled={loading}
              style={{ fontSize: "1.125rem", padding: "1rem 1.5rem" }}
            />
          </label>

          <label style={{ fontSize: "1.25rem", gap: "0.75rem" }}>
            Уровень подготовки:
            <div className="radio-group" style={{ gap: "1rem", paddingTop: "0.75rem" }}>
              <label style={{ fontSize: "1.125rem", padding: "1rem 1.5rem" }}>
                <input
                  type="radio"
                  value="beginner"
                  checked={level === "beginner"}
                  onChange={(e) => setLevel(e.target.value as UserLevel)}
                  disabled={loading}
                  style={{ width: "20px", height: "20px" }}
                />
                У меня нет опыта в программировании
              </label>
              <label style={{ fontSize: "1.125rem", padding: "1rem 1.5rem" }}>
                <input
                  type="radio"
                  value="experienced"
                  checked={level === "experienced"}
                  onChange={(e) => setLevel(e.target.value as UserLevel)}
                  disabled={loading}
                  style={{ width: "20px", height: "20px" }}
                />
                У меня есть опыт в программировании
              </label>
            </div>
          </label>

          {error && <div className="error" style={{ fontSize: "1.125rem" }}>{error}</div>}

          <button 
            onClick={handleLogin} 
            disabled={loading} 
            className="btn-primary"
            style={{ fontSize: "1.25rem", padding: "1.25rem 2.5rem", marginTop: "1.5rem" }}
          >
            {loading ? <><div className="custom-loader"></div> Вход...</> : "Войти"}
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
        <p>Привет, <strong>{user?.fio}</strong>!</p>

        <div className="flow-buttons">
          <div className="flow-button-wrapper">
            <button
              onClick={() => setScreen("random_warning")}
              disabled={user?.flow === "own"}
              className="btn-primary flow-btn-random"
            >
              <svg className="flow-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="rgba(255,255,255,0.15)"/>
                <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
                <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              </svg>
              Случайная тема
            </button>
            <div className="flow-help-icon">?</div>
            <div className="flow-help-text">
              Получите готовую тему для проекта. Система выберет задачу из пула, подходящую вашему уровню подготовки. Таймер на 14 дней начнётся сразу после выбора.
            </div>
          </div>
          
          <div className="flow-button-wrapper">
            <button
              onClick={() => setScreen("own_idea")}
              disabled={user?.flow === "random"}
              className="btn-primary flow-btn-own"
            >
              <svg className="flow-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Колба лампочки */}
                <path d="M12 2C9.5 2 7 4 7 7C7 9 8 11 9 12.5C9.5 13.5 10 14 10 15V16C10 16.5 10.5 17 11 17H13C13.5 17 14 16.5 14 16V15C14 14 14.5 13.5 15 12.5C16 11 17 9 17 7C17 4 14.5 2 12 2Z" 
                      stroke="currentColor" strokeWidth="2" fill="rgba(255,255,255,0.2)"/>
                {/* Спираль (нить накаливания) */}
                <path d="M10.5 6L11.5 7L10.5 8L11.5 9L10.5 10" 
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                <path d="M13.5 6L12.5 7L13.5 8L12.5 9L13.5 10" 
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
                {/* Цоколь */}
                <rect x="10" y="17" width="4" height="2" rx="0.5" fill="currentColor" opacity="0.8"/>
                <rect x="10.5" y="19" width="3" height="2" rx="0.5" fill="currentColor" opacity="0.6"/>
                <line x1="10" y1="20.5" x2="14" y2="20.5" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
              </svg>
              Своя тема
            </button>
            <div className="flow-help-icon">?</div>
            <div className="flow-help-text">
              Предложите свою идею для проекта. Ваша идея будет рассмотрена администратором (модерация 1-2 рабочих дня). Таймер начнётся после утверждения.
            </div>
          </div>
        </div>

        {user?.flow === "own" && (
          <div className="info">Вы уже начали сценарий "Своя тема"</div>
        )}
        {user?.flow === "random" && (
          <div className="info">Вы уже начали сценарий "Случайная тема"</div>
        )}

        {error && <div className="error">{error}</div>}

        <button 
          onClick={handleLogout}
          className="btn-secondary mt-xl"
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
            <p><strong>Внимание!</strong></p>
            <p>После выбора тему изменить нельзя.</p>
            <p>Таймер на 14 дней начнётся сразу после выбора темы.</p>
            <p>Вы уверены, что хотите получить случайную тему?</p>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="action-buttons">
            <button onClick={handleGenerateTopic} disabled={loading} className="btn-primary">
              {loading ? <><div className="custom-loader"></div> Генерация...</> : "Да, выбрать случайную тему"}
            </button>
            <button onClick={() => setScreen("choose_flow")} disabled={loading} className="btn-secondary">
              Отменить
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Экран: Анимация колеса (Iteration B)
  if (screen === "random_spinning") {
    return (
      <div className="container">
        <h1>Выбор темы</h1>
        
        <div className="result">
          {/* Показываем лоадер пока API не вернет результат */}
          {!spinResult ? (
            <div className="spinning-message">
              <div className="custom-loader"></div>
              <span>Выбираем тему для вас</span>
            </div>
          ) : (
            <>
              {/* После получения результата показываем колесо с анимацией */}
              <TopicWheel 
                onComplete={handleWheelComplete} 
                duration={3000}
                finalTopic={spinResult.user?.topic}
              />
            </>
          )}
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
          <label>
            Описание вашей идеи:
            <textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Например: Создать приложение для управления задачами с интеграцией календаря и напоминаниями"
              rows={5}
              disabled={loading}
            />
          </label>

          {error && <div className="error">{error}</div>}

          <div className="action-buttons">
            <button onClick={handleSubmitIdea} disabled={loading} className="btn-primary">
              {loading ? <><div className="custom-loader"></div> Отправка...</> : "Отправить на модерацию"}
            </button>
            <button onClick={() => setScreen("choose_flow")} disabled={loading} className="btn-secondary">
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
        <h1>Идея на модерации</h1>
        <div className="status-badge status-pending">На модерации</div>
        
        <div className="result">
          <div className="info-box">
            <h3>Ваша идея:</h3>
            <div className="topic">{submission?.text}</div>
          </div>

          <div className="info-box">
            <p>
              Ваша идея отправлена на модерацию администратору. 
              Модерация занимает 1-2 рабочих дня.
            </p>
            <p>
              Вы можете проверить статус на этой странице в любое время.
            </p>
            <p className="small">
              Отправлено: {submission?.createdAt && new Date(submission.createdAt).toLocaleString("ru-RU")}
            </p>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="action-buttons">
            <button onClick={handleCheckStatus} disabled={checkingStatus} className="btn-primary">
              {checkingStatus ? <><div className="custom-loader"></div> Проверка...</> : "Обновить статус"}
            </button>
            <button 
              onClick={handleLogout}
              className="btn-secondary"
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
        <h1>Идея отклонена</h1>
        <div className="status-badge status-rejected">Отклонено</div>
        
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
            <label>
              Исправленная идея:
              <textarea
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                placeholder="Исправьте вашу идею с учётом комментария"
                rows={5}
                disabled={loading}
              />
            </label>

            {error && <div className="error">{error}</div>}

            <div className="action-buttons">
              <button onClick={handleSubmitIdea} disabled={loading} className="btn-primary">
                {loading ? <><div className="custom-loader"></div> Отправка...</> : "Отправить исправленную идею"}
              </button>
              <button 
                onClick={handleLogout}
                className="btn-secondary"
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
    const topicStructure = parseTopicStructure(user.topic);

    return (
      <div className="container">
        <h1>Тема закреплена</h1>
        <div className="status-badge status-approved">Закреплено</div>

        <div className="result">
          {/* Секция: Ваша тема */}
          <div className="topic-section">
            <h3 className="topic-section-title">Ваша тема</h3>
            <div className="topic-section-content">
              {topicStructure.title}
            </div>
          </div>

          {/* Секция: Детали реализации */}
          {topicStructure.details && (
            <div className="topic-section">
              <h3 className="topic-section-title">Детали реализации</h3>
              <div className="topic-section-content" style={{ whiteSpace: 'pre-line' }}>
                {topicStructure.details}
              </div>
            </div>
          )}

          {/* Секция: Комментарий модератора (если есть) */}
          {adminComment && (
            <div className="topic-section moderator-comment">
              <h3 className="topic-section-title">Комментарий модератора</h3>
              <div className="topic-section-content">
                {adminComment}
              </div>
            </div>
          )}

          {/* Дедлайн и таймер */}
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
            <h2>Good Luck, Have Fun!</h2>
          </div>

          <button 
            onClick={handleLogout} 
            className="btn-secondary mt-xl"
          >
            Выйти
          </button>
        </div>
      </div>
    );
  }

  return null;
}
