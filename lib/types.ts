// Типы данных для проекта Vibe Coding Wheel

export type UserLevel = "experienced" | "beginner";
export type FlowType = "random" | "own";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface UserState {
  fio: string;
  level: UserLevel;
  flow?: FlowType; // undefined до выбора пути
  topic?: string; // финальная закреплённая тема
  chosenAt?: string; // ISO timestamp
  deadlineAt?: string; // ISO timestamp
  originalIdea?: string; // если пользователь вводил свою тему
  gigachatAdvice?: string[]; // подсказки/докрученные варианты (устаревшее, для совместимости)
}

export interface Submission {
  id: string; // уникальный ID submission
  fio: string; // ФИО пользователя
  text: string; // текст идеи
  status: SubmissionStatus; // pending | approved | rejected
  adminComment?: string; // комментарий админа (при reject или approve)
  approvedTopicText?: string; // финальная формулировка темы (при approve)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface AppState {
  users: Record<string, UserState>; // ключ = fio (нормализованный)
  usedTopics?: {
    easy: string[];
    hard: string[];
  };
  submissions?: Record<string, Submission>; // ключ = submission id
}


