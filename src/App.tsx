/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Minus, Plus, SlidersHorizontal, MonitorPlay, PenLine } from 'lucide-react';
import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
  ExerciseFolder,
  ExerciseType,
  THEME_PALETTES,
} from './types/exercise';
import { SAMPLE_EXERCISES, createBlankExercise } from './data/sampleExercises';
import { EditorWorkspace } from './components/EditorWorkspace';
import { PresenterWorkspace } from './components/PresenterWorkspace';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { ExerciseLibraryModal } from './components/ExerciseLibraryModal';
import { ExportHtmlModal } from './components/ExportHtmlModal';
import {
  buildFolderStandaloneHtml,
  buildStandaloneHtml,
} from './utils/htmlExporter';
import {
  WorkspaceSnapshot,
  beaconServerSnapshot,
  fetchServerSnapshot,
  readIdbSnapshot,
  readLocalSnapshot,
  saveServerSnapshot,
  writeIdbSnapshot,
  writeLocalSnapshotSync,
} from './utils/persistence';

const DEFAULT_A11Y: AccessibilitySettings = {
  theme: 'paper-light',
  fontSize: 18,
  lineHeight: 1.65,
  fontFamily: 'sans',
  splitRatio: 50,
};

const DEFAULT_SNAPSHOT: WorkspaceSnapshot = {
  exercises: SAMPLE_EXERCISES,
  folders: [],
  collapsedFolderIds: [],
  activeId: SAMPLE_EXERCISES[0].id,
  a11y: DEFAULT_A11Y,
  savedAt: 0,
};

type ExportTarget =
  | { kind: 'exercise'; exercise: Exercise }
  | { kind: 'folder'; folderName: string; exercises: Exercise[] };

export default function App() {
  const initialLocal = useRef(readLocalSnapshot(DEFAULT_SNAPSHOT));
  const [exercises, setExercises] = useState<Exercise[]>(
    initialLocal.current.snapshot.exercises
  );
  const [folders, setFolders] = useState<ExerciseFolder[]>(
    initialLocal.current.snapshot.folders
  );
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>(
    initialLocal.current.snapshot.collapsedFolderIds
  );
  const [activeId, setActiveId] = useState<string>(
    initialLocal.current.snapshot.activeId
  );
  const [a11y, setA11y] = useState<AccessibilitySettings>(
    initialLocal.current.snapshot.a11y
  );

  const savedAtRef = useRef<number>(initialLocal.current.snapshot.savedAt);
  const hydratedRef = useRef<boolean>(false);
  const latestSnapshotRef = useRef<WorkspaceSnapshot>(initialLocal.current.snapshot);
  const dirtyRef = useRef<boolean>(false);

  const [mode, setMode] = useState<'edit' | 'present'>('edit');
  const [a11yOpen, setA11yOpen] = useState(false);
  const [libraryModal, setLibraryModal] = useState<{
    open: boolean;
    tab: 'library' | 'create';
  }>({ open: false, tab: 'library' });
  const [exportTarget, setExportTarget] = useState<ExportTarget | null>(null);

  // Hydrate from server & IndexedDB on initial load so changes always carry over
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [serverSnap, idbSnap] = await Promise.all([
        fetchServerSnapshot(),
        readIdbSnapshot(),
      ]);
      if (cancelled || dirtyRef.current) {
        hydratedRef.current = true;
        return;
      }

      const candidates = [
        initialLocal.current.hasUserSaved ? initialLocal.current.snapshot : null,
        idbSnap,
        serverSnap,
      ].filter((c): c is WorkspaceSnapshot => c !== null);

      if (candidates.length > 0) {
        candidates.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        const newest = candidates[0];
        if (newest.savedAt > savedAtRef.current || !initialLocal.current.hasUserSaved) {
          savedAtRef.current = newest.savedAt || Date.now();
          setExercises(newest.exercises);
          setFolders(Array.isArray(newest.folders) ? newest.folders : []);
          setCollapsedFolderIds(
            Array.isArray(newest.collapsedFolderIds) ? newest.collapsedFolderIds : []
          );
          setActiveId(newest.activeId || newest.exercises[0].id);
          setA11y({ ...DEFAULT_A11Y, ...(newest.a11y || {}) });
          writeLocalSnapshotSync(newest);
          writeIdbSnapshot(newest);
        } else if (
          initialLocal.current.hasUserSaved &&
          (!serverSnap || (serverSnap.savedAt || 0) < savedAtRef.current)
        ) {
          saveServerSnapshot(initialLocal.current.snapshot);
        }
      }
      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist synchronously to localStorage + IndexedDB + debounced server sync on every change
  useEffect(() => {
    const now = hydratedRef.current ? Date.now() : savedAtRef.current;
    if (hydratedRef.current) {
      savedAtRef.current = now;
      dirtyRef.current = true;
    }
    const snapshot: WorkspaceSnapshot = {
      exercises,
      folders,
      collapsedFolderIds,
      activeId,
      a11y,
      savedAt: now,
    };
    latestSnapshotRef.current = snapshot;

    if (!hydratedRef.current && !initialLocal.current.hasUserSaved) {
      return;
    }

    writeLocalSnapshotSync(snapshot);
    writeIdbSnapshot(snapshot);

    const timer = window.setTimeout(() => {
      saveServerSnapshot(snapshot);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [exercises, folders, collapsedFolderIds, activeId, a11y]);

  // Flush immediately if user reloads or closes tab right after editing
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current && !initialLocal.current.hasUserSaved) return;
      writeLocalSnapshotSync(latestSnapshotRef.current);
      beaconServerSnapshot(latestSnapshotRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const activeExercise =
    exercises.find((ex) => ex.id === activeId) || exercises[0];

  const palette = THEME_PALETTES[a11y.theme] || THEME_PALETTES['paper-light'];

  useEffect(() => {
    const root = document.documentElement;
    if (palette.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [palette.isDark]);

  const readerFontCss =
    a11y.fontFamily === 'serif'
      ? 'var(--font-serif)'
      : a11y.fontFamily === 'readable'
        ? 'Verdana, "Plus Jakarta Sans", sans-serif'
        : 'var(--font-sans)';

  const themeCssVars = {
    '--bg-canvas': palette.bgCanvas,
    '--bg-panel': palette.bgPanel,
    '--bg-elevated': palette.bgElevated,
    '--bg-header': palette.bgHeader,
    '--text-primary': palette.textPrimary,
    '--text-secondary': palette.textSecondary,
    '--text-muted': palette.textMuted,
    '--border-subtle': palette.borderSubtle,
    '--border-strong': palette.borderStrong,
    '--accent-bg': palette.accentBg,
    '--accent-text': palette.accentText,
    '--accent-fg': palette.accentFg,
    '--accent-soft': palette.accentSoft,
    '--accent-border': palette.accentBorder,
    '--success-fg': palette.successFg,
    '--success-bg': palette.successBg,
    '--error-fg': palette.errorFg,
    '--error-bg': palette.errorBg,
    '--scroll-thumb': palette.scrollThumb,
    '--reader-font-size': `${a11y.fontSize}px`,
    '--reader-line-height': `${a11y.lineHeight}`,
    '--reader-font-family': readerFontCss,
  } as React.CSSProperties;

  const markDirty = () => {
    hydratedRef.current = true;
    dirtyRef.current = true;
  };

  const handleUpdateExercise = (updated: Exercise) => {
    markDirty();
    setExercises((prev) =>
      prev.map((ex) => (ex.id === updated.id ? updated : ex))
    );
  };

  const handleCreateExercise = (type: ExerciseType, folderId?: string) => {
    markDirty();
    const created = createBlankExercise(type);
    if (folderId) {
      created.folderId = folderId;
    }
    setExercises((prev) => [created, ...prev]);
    setActiveId(created.id);
    setMode('edit');
  };

  const handleDuplicateExercise = (id: string) => {
    markDirty();
    const src = exercises.find((ex) => ex.id === id);
    if (!src) return;
    const copy: Exercise = {
      ...JSON.parse(JSON.stringify(src)),
      id: `ex-${Math.random().toString(36).slice(2, 9)}`,
      title: `${src.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    setExercises((prev) => [copy, ...prev]);
    setActiveId(copy.id);
  };

  const handleDeleteExercise = (id: string) => {
    if (exercises.length <= 1) return;
    markDirty();
    setExercises((prev) => {
      const next = prev.filter((ex) => ex.id !== id);
      if (id === activeId && next[0]) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  const handleMoveExerciseToFolder = (exerciseId: string, folderId?: string) => {
    markDirty();
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId ? { ...ex, folderId: folderId || undefined } : ex
      )
    );
  };

  const handleCreateFolder = (name: string) => {
    markDirty();
    const folder: ExerciseFolder = {
      id: `fld-${Math.random().toString(36).slice(2, 9)}`,
      name,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => [...prev, folder]);
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    markDirty();
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name } : f))
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    markDirty();
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setCollapsedFolderIds((prev) => prev.filter((id) => id !== folderId));
    setExercises((prev) =>
      prev.map((ex) =>
        ex.folderId === folderId ? { ...ex, folderId: undefined } : ex
      )
    );
  };

  const handleToggleFolderCollapse = (folderId: string) => {
    markDirty();
    setCollapsedFolderIds((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleImportData = (payload: {
    exercises: Exercise[];
    folders?: ExerciseFolder[];
  }) => {
    markDirty();
    const folderIdRemap = new Map<string, string>();
    const newFolders: ExerciseFolder[] = [];

    if (payload.folders && payload.folders.length > 0) {
      payload.folders.forEach((f) => {
        const newId = `fld-${Math.random().toString(36).slice(2, 9)}`;
        folderIdRemap.set(f.id, newId);
        newFolders.push({ ...f, id: newId });
      });
    }

    const stamped = payload.exercises.map((ex) => {
      let targetFolderId: string | undefined = undefined;
      if (ex.folderId && folderIdRemap.has(ex.folderId)) {
        targetFolderId = folderIdRemap.get(ex.folderId);
      } else if (newFolders.length === 1 && payload.folders?.length === 1) {
        targetFolderId = newFolders[0].id;
      }
      return {
        ...ex,
        id: `ex-${Math.random().toString(36).slice(2, 9)}`,
        folderId: targetFolderId,
        updatedAt: new Date().toISOString(),
      };
    });

    if (newFolders.length > 0) {
      setFolders((prev) => [...prev, ...newFolders]);
    }
    setExercises((prev) => [...stamped, ...prev]);
    if (stamped[0]) setActiveId(stamped[0].id);
  };

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const slugify = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handleExportAllJson = () => {
    triggerDownload(
      'wysiwygr-uoe-library.json',
      JSON.stringify({ folders, exercises }, null, 2),
      'application/json'
    );
  };

  const handleExportFolderJson = (
    folderName: string,
    folderExercises: Exercise[]
  ) => {
    triggerDownload(
      `${slugify(folderName) || 'folder'}-exercises.json`,
      JSON.stringify({ folderName, exercises: folderExercises }, null, 2),
      'application/json'
    );
  };

  const handleConfirmProtectedHtmlExport = (password: string) => {
    if (!exportTarget) return;
    if (exportTarget.kind === 'exercise') {
      const html = buildStandaloneHtml(exportTarget.exercise, a11y, password);
      const slug = slugify(exportTarget.exercise.title || 'exercise');
      triggerDownload(
        `${slug || 'exercise'}.html`,
        html,
        'text/html;charset=utf-8'
      );
    } else {
      const html = buildFolderStandaloneHtml(
        exportTarget.folderName,
        exportTarget.exercises,
        a11y,
        password
      );
      const slug = slugify(exportTarget.folderName || 'folder');
      triggerDownload(
        `${slug || 'folder'}-pack.html`,
        html,
        'text/html;charset=utf-8'
      );
    }
  };

  const activeMeta = EXERCISE_TYPES.find((m) => m.type === activeExercise.type)!;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        ...themeCssVars,
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Bar — 3-Zone Contract */}
      <header
        className="no-print flex items-center justify-between gap-8 px-6 py-3.5 border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <span
          className="text-xl font-bold tracking-tight whitespace-nowrap shrink-0"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          WYSIWYGR&amp;UOE
        </span>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setLibraryModal({ open: true, tab: 'library' })}
            className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => setLibraryModal({ open: true, tab: 'create' })}
            className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            New Exercise
          </button>
          <button
            type="button"
            onClick={() => setA11yOpen(true)}
            className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            Accessibility
          </button>
          <button
            type="button"
            onClick={() =>
              setExportTarget({ kind: 'exercise', exercise: activeExercise })
            }
            className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            Export HTML
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'edit' ? 'present' : 'edit'))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--accent-text)',
            }}
          >
            {mode === 'edit' ? (
              <>
                <MonitorPlay className="w-4 h-4" />
                <span>Present on Screen</span>
              </>
            ) : (
              <>
                <PenLine className="w-4 h-4" />
                <span>Back to Editor</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Secondary Workspace Toolbar: Exercise Switcher & Quick Accessibility Strip */}
      <div
        className="no-print flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <label
            htmlFor="quick-exercise-select"
            className="text-xs font-medium whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            Active Exercise:
          </label>
          <select
            id="quick-exercise-select"
            value={activeExercise.id}
            onChange={(e) => {
              markDirty();
              setActiveId(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border max-w-[17rem] sm:max-w-[28rem] truncate cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {exercises.map((ex) => {
              const m = EXERCISE_TYPES.find((t) => t.type === ex.type);
              return (
                <option key={ex.id} value={ex.id}>
                  {m?.title} — {ex.title || 'Untitled'}
                </option>
              );
            })}
          </select>

          <span
            className="hidden xl:inline text-xs whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            {activeMeta.title}
          </span>
        </div>

        {/* Quick Accessibility & Mobile Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setLibraryModal({ open: true, tab: 'library' })}
            className="md:hidden px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Library
          </button>

          <button
            type="button"
            onClick={() =>
              setExportTarget({ kind: 'exercise', exercise: activeExercise })
            }
            className="md:hidden px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            Export
          </button>

          {/* Quick Text Size */}
          <div
            className="flex items-center rounded-lg border overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                markDirty();
                setA11y((s) => ({ ...s, fontSize: Math.max(14, s.fontSize - 1) }));
              }}
              className="px-2 py-1.5 cursor-pointer hover:opacity-75"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Decrease text size"
              title="Decrease text size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span
              className="px-2 text-xs font-mono font-semibold tabular-nums whitespace-nowrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              {a11y.fontSize}px
            </span>
            <button
              type="button"
              onClick={() => {
                markDirty();
                setA11y((s) => ({ ...s, fontSize: Math.min(28, s.fontSize + 1) }));
              }}
              className="px-2 py-1.5 cursor-pointer hover:opacity-75"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Increase text size"
              title="Increase text size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Theme Swatches */}
          <div
            className="hidden sm:flex items-center gap-1.5"
            role="group"
            aria-label="Quick colour themes"
          >
            {Object.values(THEME_PALETTES).map((t) => {
              const active = a11y.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    markDirty();
                    setA11y((s) => ({ ...s, theme: t.id }));
                  }}
                  title={t.name}
                  aria-label={`Theme: ${t.name}`}
                  className="w-6 h-6 rounded-md border cursor-pointer transition-transform hover:scale-105 flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: t.bgPanel,
                    borderColor: active ? 'var(--accent-fg)' : t.borderStrong,
                    color: t.textPrimary,
                    boxShadow: active ? '0 0 0 2px var(--accent-fg)' : 'none',
                  }}
                >
                  A
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setA11yOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Display</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Panel Workspace */}
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {mode === 'edit' ? (
          <EditorWorkspace
            exercise={activeExercise}
            onChange={handleUpdateExercise}
            splitRatio={a11y.splitRatio}
            onSplitRatioChange={(ratio) => {
              markDirty();
              setA11y((s) => ({ ...s, splitRatio: ratio }));
            }}
          />
        ) : (
          <PresenterWorkspace
            exercise={activeExercise}
            splitRatio={a11y.splitRatio}
            onSplitRatioChange={(ratio) => {
              markDirty();
              setA11y((s) => ({ ...s, splitRatio: ratio }));
            }}
          />
        )}
      </main>

      {/* Modals */}
      <AccessibilityPanel
        open={a11yOpen}
        onClose={() => setA11yOpen(false)}
        settings={a11y}
        onChange={(next) => {
          markDirty();
          setA11y(next);
        }}
        onReset={() => {
          markDirty();
          setA11y(DEFAULT_A11Y);
        }}
      />

      <ExerciseLibraryModal
        open={libraryModal.open}
        initialTab={libraryModal.tab}
        onClose={() => setLibraryModal((s) => ({ ...s, open: false }))}
        exercises={exercises}
        folders={folders}
        collapsedFolderIds={collapsedFolderIds}
        activeExerciseId={activeExercise.id}
        onSelectExercise={(id) => {
          markDirty();
          setActiveId(id);
        }}
        onCreateExercise={handleCreateExercise}
        onDuplicateExercise={handleDuplicateExercise}
        onDeleteExercise={handleDeleteExercise}
        onMoveExerciseToFolder={handleMoveExerciseToFolder}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onToggleFolderCollapse={handleToggleFolderCollapse}
        onExportExerciseHtml={(ex) =>
          setExportTarget({ kind: 'exercise', exercise: ex })
        }
        onExportFolderHtml={(folderName, folderExercises) =>
          setExportTarget({
            kind: 'folder',
            folderName,
            exercises: folderExercises,
          })
        }
        onExportFolderJson={handleExportFolderJson}
        onImportData={handleImportData}
        onExportAllJson={handleExportAllJson}
      />

      <ExportHtmlModal
        open={exportTarget !== null}
        targetLabel={
          exportTarget?.kind === 'folder'
            ? `Folder: ${exportTarget.folderName} (${exportTarget.exercises.length} exercises)`
            : exportTarget?.kind === 'exercise'
              ? exportTarget.exercise.title || 'Untitled Exercise'
              : ''
        }
        targetDescription={
          exportTarget?.kind === 'folder'
            ? 'Exports all exercises in this folder into one interactive HTML file with an exercise switcher and password-protected answer keys.'
            : 'Exports this exercise as a standalone interactive HTML file with resizable side-by-side panels and a password-protected answer key.'
        }
        onClose={() => setExportTarget(null)}
        onConfirmExport={handleConfirmProtectedHtmlExport}
      />
    </div>
  );
}
