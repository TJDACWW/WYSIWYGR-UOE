import {
  AccessibilitySettings,
  Exercise,
  ExerciseFolder,
} from '../types/exercise';

export interface WorkspaceSnapshot {
  exercises: Exercise[];
  folders: ExerciseFolder[];
  collapsedFolderIds: string[];
  activeId: string;
  a11y: AccessibilitySettings;
  savedAt: number;
}

const LS_WORKSPACE_KEY = 'wysiwygr_uoe_workspace_v1';
const LEGACY_KEYS = {
  exercises: 'lexis_studio_exercises_v1',
  folders: 'lexis_studio_folders_v1',
  activeId: 'lexis_studio_active_id_v1',
  a11y: 'lexis_studio_a11y_v1',
};

const IDB_NAME = 'wysiwygr_uoe_db';
const IDB_STORE = 'workspace';
const IDB_KEY = 'current';

export function readLocalSnapshot(defaults: WorkspaceSnapshot): {
  snapshot: WorkspaceSnapshot;
  hasUserSaved: boolean;
} {
  try {
    const raw = localStorage.getItem(LS_WORKSPACE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
      if (Array.isArray(parsed.exercises)) {
        return {
          snapshot: {
            exercises: parsed.exercises,
            folders: Array.isArray(parsed.folders) ? parsed.folders : [],
            collapsedFolderIds: Array.isArray(parsed.collapsedFolderIds)
              ? parsed.collapsedFolderIds
              : [],
            activeId: parsed.activeId || parsed.exercises[0]?.id || '',
            a11y: { ...defaults.a11y, ...(parsed.a11y || {}) },
            savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
          },
          hasUserSaved: true,
        };
      }
    }

    // Migrate from legacy Lexis Studio keys if present
    const legacyExRaw = localStorage.getItem(LEGACY_KEYS.exercises);
    if (legacyExRaw) {
      const legacyEx = JSON.parse(legacyExRaw);
      if (Array.isArray(legacyEx)) {
        const legacyFoldersRaw = localStorage.getItem(LEGACY_KEYS.folders);
        const legacyActive = localStorage.getItem(LEGACY_KEYS.activeId);
        const legacyA11yRaw = localStorage.getItem(LEGACY_KEYS.a11y);
        const migrated: WorkspaceSnapshot = {
          exercises: legacyEx,
          folders: legacyFoldersRaw ? JSON.parse(legacyFoldersRaw) : [],
          collapsedFolderIds: [],
          activeId: legacyActive || legacyEx[0]?.id || '',
          a11y: {
            ...defaults.a11y,
            ...(legacyA11yRaw ? JSON.parse(legacyA11yRaw) : {}),
          },
          savedAt: Date.now(),
        };
        writeLocalSnapshotSync(migrated);
        return { snapshot: migrated, hasUserSaved: true };
      }
    }
  } catch {
    // Fallback below
  }
  return { snapshot: defaults, hasUserSaved: false };
}

export function writeLocalSnapshotSync(snapshot: WorkspaceSnapshot): void {
  try {
    localStorage.setItem(LS_WORKSPACE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / sandbox errors; IndexedDB & server handle backup
  }
}

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readIdbSnapshot(): Promise<WorkspaceSnapshot | null> {
  const db = await openIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const res = req.result as WorkspaceSnapshot | undefined;
        if (res && Array.isArray(res.exercises)) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeIdbSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(snapshot, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function fetchServerSnapshot(): Promise<WorkspaceSnapshot | null> {
  try {
    const res = await fetch('/api/workspace', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && !data.empty && Array.isArray(data.exercises)) {
      return data as WorkspaceSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveServerSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
  try {
    await fetch('/api/workspace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    });
  } catch {
    // Ignore transient network errors
  }
}

export function beaconServerSnapshot(snapshot: WorkspaceSnapshot): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(snapshot)], { type: 'text/plain' });
      navigator.sendBeacon('/api/workspace', blob);
    }
  } catch {
    // Ignore
  }
}
