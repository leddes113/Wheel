// Утилиты для работы с файловым хранилищем data/state.json

import fs from "fs/promises";
import path from "path";
import { AppState, UserState, Submission, WaveTopics } from "./types";
import { randomUUID } from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

// Инициализация хранилища
async function ensureStorageExists(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    await fs.access(STATE_FILE);
  } catch {
    const initialState: AppState = { currentWave: 1, users: {}, submissions: {}, usedTopics: {}, waveEmployees: {} };
    await fs.writeFile(STATE_FILE, JSON.stringify(initialState, null, 2), "utf-8");
  }
}

// Чтение состояния
export async function readState(): Promise<AppState> {
  await ensureStorageExists();
  const data = await fs.readFile(STATE_FILE, "utf-8");
  const state = JSON.parse(data) as AppState;
  
  if (!state.submissions) state.submissions = {};
  if (!state.currentWave) state.currentWave = 1;
  if (!state.waveEmployees) state.waveEmployees = {};

  // Миграция usedTopics из старого формата { easy, hard } в новый { "1": { easy, hard } }
  if (!state.usedTopics) {
    state.usedTopics = {};
  } else if ('easy' in state.usedTopics || 'hard' in state.usedTopics) {
    const legacy = state.usedTopics as unknown as { easy?: string[]; hard?: string[] };
    state.usedTopics = {
      "1": { easy: legacy.easy || [], hard: legacy.hard || [] }
    };
  }
  
  return state;
}

export function getCurrentWave(state: AppState): number {
  return state.currentWave || 1;
}

export function getWaveTopics(state: AppState, wave?: number): WaveTopics {
  const w = wave ?? getCurrentWave(state);
  const key = String(w);
  if (!state.usedTopics) state.usedTopics = {};
  if (!state.usedTopics[key]) state.usedTopics[key] = { easy: [], hard: [] };
  return state.usedTopics[key];
}

// Атомарная запись состояния
export async function writeState(state: AppState): Promise<void> {
  await ensureStorageExists();
  const tempFile = `${STATE_FILE}.tmp`;
  
  // Записываем во временный файл
  await fs.writeFile(tempFile, JSON.stringify(state, null, 2), "utf-8");
  
  // Атомарная замена
  await fs.rename(tempFile, STATE_FILE);
}

// Нормализация ФИО для использования как ключа
export function normalizeFio(fio: string): string {
  return fio.trim().toLowerCase();
}

// ==================== USERS ====================

// Получить пользователя по ФИО
export async function getUser(fio: string): Promise<UserState | null> {
  const state = await readState();
  const key = normalizeFio(fio);
  return state.users[key] || null;
}

// Сохранить/обновить пользователя
export async function saveUser(user: UserState): Promise<void> {
  const state = await readState();
  const key = normalizeFio(user.fio);
  state.users[key] = user;
  await writeState(state);
}

// Получить всех пользователей (для админки), с опциональным фильтром по волне
export async function getAllUsers(wave?: number): Promise<UserState[]> {
  const state = await readState();
  const users = Object.values(state.users);
  if (wave !== undefined) {
    return users.filter(u => (u.wave ?? 1) === wave);
  }
  return users;
}

// ==================== SUBMISSIONS ====================

// Создать новый submission
export async function createSubmission(
  fio: string,
  text: string,
  wave?: number
): Promise<Submission> {
  const state = await readState();
  
  const now = new Date().toISOString();
  const submission: Submission = {
    id: randomUUID(),
    fio,
    text,
    status: "pending",
    wave: wave ?? getCurrentWave(state),
    createdAt: now,
    updatedAt: now,
  };
  
  state.submissions![submission.id] = submission;
  await writeState(state);
  
  return submission;
}

// Получить submission по ID
export async function getSubmission(id: string): Promise<Submission | null> {
  const state = await readState();
  return state.submissions?.[id] || null;
}

// Получить submission по FIO (последний в текущей волне)
export async function getSubmissionByFio(fio: string): Promise<Submission | null> {
  const state = await readState();
  const normalizedFio = normalizeFio(fio);
  const wave = getCurrentWave(state);
  
  const submissions = Object.values(state.submissions || {}).filter(
    (sub) => normalizeFio(sub.fio) === normalizedFio && (sub.wave ?? 1) === wave
  );
  
  if (submissions.length === 0) return null;
  
  submissions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  return submissions[0];
}

// Получить все submissions с фильтрами по статусу и волне
export async function getAllSubmissions(
  statusFilter?: "pending" | "approved" | "rejected",
  wave?: number
): Promise<Submission[]> {
  const state = await readState();
  let submissions = Object.values(state.submissions || {});
  
  if (wave !== undefined) {
    submissions = submissions.filter((sub) => (sub.wave ?? 1) === wave);
  }
  
  if (statusFilter) {
    submissions = submissions.filter((sub) => sub.status === statusFilter);
  }
  
  return submissions;
}

// Обновить submission (для approve/reject)
export async function updateSubmission(submission: Submission): Promise<void> {
  const state = await readState();
  
  submission.updatedAt = new Date().toISOString();
  state.submissions![submission.id] = submission;
  
  await writeState(state);
}

