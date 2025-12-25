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
  completedAt?: string;
  gitLink?: string;
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
  
  // Для завершения задания
  const [gitLink, setGitLink] = useState("");
  const [completing, setCompleting] = useState(false);
  const [showGitForm, setShowGitForm] = useState(false);

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

  // Завершение задания
  const handleCompleteTask = async () => {
    if (!user) return;

    // Проверяем что ссылка на репозиторий указана
    if (!gitLink.trim()) {
      setError("Укажите ссылку на Git репозиторий");
      return;
    }

    setCompleting(true);
    setError("");

    try {
      const response = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fio: user.fio, gitLink: gitLink.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Ошибка завершения задания");
        setCompleting(false);
        return;
      }

      // Обновляем пользователя с информацией о завершении
      setUser(data.user);
      setGitLink(""); // очищаем поле
      setShowGitForm(false); // скрываем форму
    } catch (err) {
      setError("Ошибка соединения с сервером");
    } finally {
      setCompleting(false);
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
    setGitLink("");
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
          ) : spinResult.error ? (
            // Если ошибка - показываем её и даем возможность вернуться
            <div>
              <div className="error">{spinResult.error}</div>
              <button 
                onClick={() => setScreen("random_warning")} 
                className="btn-secondary mt-lg"
              >
                Вернуться назад
              </button>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', position: 'relative' }}>
          <p style={{ margin: 0 }}>Опишите идею вашего проекта</p>
          <div 
            className="info-icon-wrapper" 
            style={{ position: 'relative', display: 'inline-block' }}
            onMouseEnter={(e) => {
              const tooltip = e.currentTarget.querySelector('.info-tooltip') as HTMLElement;
              if (tooltip) {
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
              }
            }}
            onMouseLeave={(e) => {
              const tooltip = e.currentTarget.querySelector('.info-tooltip') as HTMLElement;
              if (tooltip) {
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
              }
            }}
          >
            <span 
              className="info-icon"
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '3px solid var(--color-error)',
                background: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-error)',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'help',
                userSelect: 'none',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
              }}
              title="Критерии достаточного описания идей"
            >
              !
            </span>
            <div 
              className="info-tooltip"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                padding: '1rem',
                background: 'rgba(20, 20, 30, 0.98)',
                border: '2px solid var(--color-error)',
                borderRadius: '8px',
                minWidth: '300px',
                maxWidth: '400px',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: 'var(--color-text-primary)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                opacity: 0,
                visibility: 'hidden',
                transition: 'opacity 0.2s, visibility 0.2s',
                zIndex: 1000,
                whiteSpace: 'normal',
                pointerEvents: 'none'
              }}
            >
              <strong style={{ color: 'var(--color-error)', display: 'block', marginBottom: '0.5rem' }}>
                Критерии достаточного описания идей:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Приложение должно быть продуктом и нести бизнес-ценность;</li>
                <li>Чисто технические сервисы не принимаются;</li>
                <li>Помимо идеи приложения, опишите основной пользовательский сценарий и критерии готовности.</li>
              </ul>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-error)', fontWeight: 'bold' }}>
                При несоответствии указанным требованиям, идеи будут отклонены без комментариев!
              </p>
            </div>
          </div>
        </div>

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
          {/* Дедлайн (переместили вверх) */}
          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem 1.5rem', 
            borderRadius: '8px', 
            background: 'rgba(34, 211, 238, 0.08)',
            border: '1px solid rgba(34, 211, 238, 0.3)',
            display: 'flex',
            justifyContent: 'space-around',
            gap: '2rem'
          }}>
            {user.deadlineAt && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>Дедлайн</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-secondary-accent)' }}>
                  {new Date(user.deadlineAt).toLocaleDateString("ru-RU")}
                </div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.25rem' }}>Осталось дней</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-secondary-accent)' }}>
                {daysRemaining ?? 0}
              </div>
            </div>
          </div>

          {/* Секция: Ваша тема */}
          <div className="topic-section" style={{ 
            background: 'rgba(34, 211, 238, 0.05)', 
            borderColor: 'rgba(34, 211, 238, 0.3)'
          }}>
            <h3 className="topic-section-title" style={{ color: 'var(--color-secondary-accent)' }}>Ваша тема</h3>
            <div className="topic-section-content">
              {topicStructure.title}
            </div>
          </div>

          {/* Секция: Что должно быть реализовано */}
          {topicStructure.details && (
            <div className="topic-section" style={{ 
              background: 'rgba(139, 92, 246, 0.05)', 
              borderColor: 'rgba(139, 92, 246, 0.3)'
            }}>
              <h3 className="topic-section-title" style={{ color: '#a78bfa' }}>Что должно быть реализовано</h3>
              <div className="topic-section-content" style={{ whiteSpace: 'pre-line' }}>
                {topicStructure.details}
              </div>
            </div>
          )}

          {/* Секция: Комментарий модератора (если есть) */}
          {adminComment && (
            <div className="topic-section moderator-comment" style={{ 
              background: 'rgba(251, 191, 36, 0.05)', 
              borderColor: 'rgba(251, 191, 36, 0.3)'
            }}>
              <h3 className="topic-section-title" style={{ color: '#fbbf24' }}>Комментарий модератора</h3>
              <div className="topic-section-content">
                {adminComment}
              </div>
            </div>
          )}

          {/* Блок завершения задания */}
          {user.completedAt ? (
            // Задание уже завершено
            <div className="info-box" style={{ marginTop: '2rem' }}>
              <h3 style={{ color: 'var(--color-primary-accent)', marginBottom: '1rem' }}>Задание завершено!</h3>
              <p>
                Дата завершения: <strong>{new Date(user.completedAt).toLocaleDateString("ru-RU")}</strong>
              </p>
              {user.gitLink && (
                <p style={{ marginTop: '0.5rem' }}>
                  Ссылка на репозиторий: <a href={user.gitLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-secondary-accent)', textDecoration: 'underline' }}>{user.gitLink}</a>
                </p>
              )}
            </div>
          ) : (
            // Кнопка и форма для завершения задания
            <div style={{ marginTop: '2rem' }}>
              {!showGitForm ? (
                // Кнопка "Я завершил задание"
                <button 
                  onClick={() => setShowGitForm(true)} 
                  className="btn-primary"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--color-primary-accent) 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                  }}
                >
                  Я завершил задание
                </button>
              ) : (
                // Форма для ввода репозитория
                <div className="form" style={{ border: '1px solid rgba(255, 255, 255, 0.12)', padding: '1.5rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Завершение задания</h3>
                  <label>
                    Ссылка на Git репозиторий <span style={{ color: 'var(--color-error)' }}>*</span>
                    <input
                      type="url"
                      value={gitLink}
                      onChange={(e) => setGitLink(e.target.value)}
                      placeholder="https://github.com/username/repo"
                      disabled={completing}
                      style={{ fontSize: "1rem", padding: "0.875rem 1.25rem" }}
                      required
                    />
                  </label>

                  {error && <div className="error">{error}</div>}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button 
                      onClick={handleCompleteTask} 
                      disabled={completing}
                      className="btn-primary"
                      style={{ 
                        flex: 1,
                        background: 'linear-gradient(135deg, var(--color-primary-accent) 0%, #7c3aed 100%)',
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                      }}
                    >
                      {completing ? <><div className="custom-loader"></div> Отправка...</> : "Отправить"}
                    </button>
                    <button 
                      onClick={() => {
                        setShowGitForm(false);
                        setGitLink("");
                        setError("");
                      }} 
                      disabled={completing}
                      className="btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="good-luck" style={{ 
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)',
            border: '2px solid var(--color-secondary-accent)',
            boxShadow: '0 4px 20px rgba(34, 211, 238, 0.2)'
          }}>
            <h2 style={{ color: 'var(--color-secondary-accent)' }}>Good Luck, Have Fun!</h2>
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
