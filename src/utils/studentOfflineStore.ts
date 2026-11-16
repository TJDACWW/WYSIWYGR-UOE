import { Exercise } from '../types/exercise';
import { stripExerciseAnswers } from './stripAnswers';

export interface SavedStudentExercise {
  storageKey: string;
  exercise: Exercise;
  savedAt: string;
  lastOpenedAt: string;
  source: 'qr-offline' | 'server-share';
}

const STUDENT_SAVED_KEY = 'wysiwygr_student_saved_v1';
const STUDENT_ROLE_KEY = 'wysiwygr_last_role_v1';
const STUDENT_IDB_NAME = 'wysiwygr_student_db';
const STUDENT_IDB_STORE = 'saved_exercises';

export function computeStudentStorageKey(
  exercise: Exercise,
  shareId?: string | null,
  offlineToken?: string | null
): string {
  if (shareId) return `wysiwygr_student_share_${shareId}`;
  if (offlineToken) return `wysiwygr_student_offline_${offlineToken.slice(0, 28)}`;
  return `wysiwygr_student_ex_${exercise.id || 'shared'}`;
}

export function markLastRole(role: 'teacher' | 'student'): void {
  try {
    localStorage.setItem(STUDENT_ROLE_KEY, role);
  } catch {
    // Ignore storage errors
  }
}

export function readLastRole(): 'teacher' | 'student' | null {
  try {
    const val = localStorage.getItem(STUDENT_ROLE_KEY);
    return val === 'teacher' || val === 'student' ? val : null;
  } catch {
    return null;
  }
}

export function readSavedStudentExercisesSync(): SavedStudentExercise[] {
  try {
    const raw = localStorage.getItem(STUDENT_SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedStudentExercise =>
          Boolean(item && typeof item.storageKey === 'string' && item.exercise)
      )
      .sort((a, b) =>
        (b.lastOpenedAt || b.savedAt).localeCompare(a.lastOpenedAt || a.savedAt)
      );
  } catch {
    return [];
  }
}

function writeSavedStudentExercisesSync(list: SavedStudentExercise[]): void {
  try {
    localStorage.setItem(STUDENT_SAVED_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota errors
  }
}

function openStudentDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(STUDENT_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STUDENT_IDB_STORE)) {
        db.createObjectStore(STUDENT_IDB_STORE, { keyPath: 'storageKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function writeStudentIdbList(list: SavedStudentExercise[]): Promise<void> {
  try {
    const db = await openStudentDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STUDENT_IDB_STORE, 'readwrite');
      const store = tx.objectStore(STUDENT_IDB_STORE);
      store.clear();
      for (const item of list) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore IDB errors
  }
}

export async function listSavedStudentExercises(): Promise<SavedStudentExercise[]> {
  const localList = readSavedStudentExercisesSync();
  try {
    const db = await openStudentDb();
    const idbList = await new Promise<SavedStudentExercise[]>((resolve, reject) => {
      const tx = db.transaction(STUDENT_IDB_STORE, 'readonly');
      const req = tx.objectStore(STUDENT_IDB_STORE).getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (idbList.length === 0) return localList;
    const merged = new Map<string, SavedStudentExercise>();
    for (const item of [...idbList, ...localList]) {
      if (!item?.storageKey || !item.exercise) continue;
      const existing = merged.get(item.storageKey);
      if (
        !existing ||
        (item.lastOpenedAt || item.savedAt) >
          (existing.lastOpenedAt || existing.savedAt)
      ) {
        merged.set(item.storageKey, {
          ...item,
          exercise: stripExerciseAnswers(item.exercise),
        });
      }
    }
    const sorted = Array.from(merged.values()).sort((a, b) =>
      (b.lastOpenedAt || b.savedAt).localeCompare(a.lastOpenedAt || a.savedAt)
    );
    writeSavedStudentExercisesSync(sorted);
    return sorted;
  } catch {
    return localList;
  }
}

export async function saveStudentExercise(
  rawExercise: Exercise,
  storageKey: string,
  source: 'qr-offline' | 'server-share'
): Promise<SavedStudentExercise[]> {
  const cleanExercise = stripExerciseAnswers(rawExercise);
  const now = new Date().toISOString();
  const current = await listSavedStudentExercises();
  const existing = current.find((it) => it.storageKey === storageKey);

  const entry: SavedStudentExercise = {
    storageKey,
    exercise: cleanExercise,
    savedAt: existing?.savedAt || now,
    lastOpenedAt: now,
    source,
  };

  const next = [
    entry,
    ...current.filter((it) => it.storageKey !== storageKey),
  ].slice(0, 40);

  writeSavedStudentExercisesSync(next);
  await writeStudentIdbList(next);
  markLastRole('student');
  return next;
}

export async function deleteSavedStudentExercise(
  storageKey: string
): Promise<SavedStudentExercise[]> {
  const current = await listSavedStudentExercises();
  const next = current.filter((it) => it.storageKey !== storageKey);
  writeSavedStudentExercisesSync(next);
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore
  }
  await writeStudentIdbList(next);
  return next;
}
