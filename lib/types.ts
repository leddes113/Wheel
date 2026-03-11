// Типы данных для проекта Vibe Coding Wheel

export type UserLevel = "experienced" | "beginner";
export type FlowType = "random" | "own";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface UserState {
  fio: string;
  level: UserLevel;
  wave?: number;
  flow?: FlowType; // undefined до выбора пути
  topic?: string; // финальная закреплённая тема
  chosenAt?: string; // ISO timestamp
  deadlineAt?: string; // ISO timestamp
  originalIdea?: string; // если пользователь вводил свою тему
  completedAt?: string; // ISO timestamp - дата завершения задания
  gitLink?: string; // опциональная ссылка на git репозиторий
}

export interface Submission {
  id: string; // уникальный ID submission
  fio: string; // ФИО пользователя
  text: string; // текст идеи
  status: SubmissionStatus; // pending | approved | rejected
  wave?: number;
  adminComment?: string; // комментарий админа (при reject или approve)
  approvedTopicText?: string; // финальная формулировка темы (при approve)
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface WaveTopics {
  easy: string[];
  hard: string[];
}

export interface WaveEmployees {
  employees: string[];
  totalEmployees: number;
}

export interface AppState {
  currentWave?: number;
  users: Record<string, UserState>; // ключ = fio (нормализованный)
  usedTopics?: Record<string, WaveTopics>; // ключ = номер волны
  submissions?: Record<string, Submission>; // ключ = submission id
  waveEmployees?: Record<string, WaveEmployees>; // снэпшоты сотрудников по волнам
}


