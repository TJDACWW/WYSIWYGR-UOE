/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Minus, Plus, SlidersHorizontal, MonitorPlay, PenLine } from 'lucide-react';
import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
  ExerciseType,
  THEME_PALETTES,
} from './types/exercise';
import { SAMPLE_EXERCISES, createBlankExercise } from './data/sampleExercises';
import { EditorWorkspace } from './components/EditorWorkspace';
import { PresenterWorkspace } from './components/PresenterWorkspace';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { ExerciseLibraryModal } from './components/ExerciseLibraryModal';
import { buildStandaloneHtml } from './utils/htmlExporter';

const STORAGE_EXERCISES_KEY = 'lexis_studio_exercises_v1';
const STORAGE_ACTIVE_ID_KEY = 'lexis_studio_active_id_v1';
const STORAGE_A11Y_KEY = 'lexis_studio_a11y_v1';

const DEFAULT_A11Y: AccessibilitySettings = {
  theme: 'paper-light',
  fontSize: 18,
  lineHeight: 1.65,
  fontFamily: 'sans',
  splitRatio: 50,
};

export default function App() {
  const [exercises, setExercises] = useState<Exercise[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXERCISES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to seeded samples
    }
    return SAMPLE_EXERCISES;
  });

  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (savedId) return savedId;
    } catch {
      // Ignore
    }
    return SAMPLE_EXERCISES[0].id;
  });

  const [a11y, setA11y] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_A11Y_KEY);
      if (saved) return { ...DEFAULT_A11Y, ...JSON.parse(saved) };
    } catch {
      // Ignore
    }
    return DEFAULT_A11Y;
  });

  const [mode, setMode] = useState<'edit' | 'present'>('edit');
  const [a11yOpen, setA11yOpen] = useState(false);
  const [libraryModal, setLibraryModal] = useState<{
    open: boolean;
    tab: 'library' | 'create';
  }>({ open: false, tab: 'library' });

  // Persist exercises & active selection
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EXERCISES_KEY, JSON.stringify(exercises));
    } catch {
      // Ignore storage quota errors
    }
  }, [exercises]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeId);
    } catch {
      // Ignore
    }
  }, [activeId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_A11Y_KEY, JSON.stringify(a11y));
    } catch {
      // Ignore
    }
  }, [a11y]);

  const activeExercise =
    exercises.find((ex) => ex.id === activeId) || exercises[0];

  const palette = THEME_PALETTES[a11y.theme] || THEME_PALETTES['paper-light'];

  // Sync Tailwind dark class if dark palette is active
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

  const handleUpdateExercise = (updated: Exercise) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === updated.id ? updated : ex))
    );
  };

  const handleCreateExercise = (type: ExerciseType) => {
    const created = createBlankExercise(type);
    setExercises((prev) => [created, ...prev]);
    setActiveId(created.id);
    setMode('edit');
  };

  const handleDuplicateExercise = (id: string) => {
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
    setExercises((prev) => {
      const next = prev.filter((ex) => ex.id !== id);
      if (id === activeId && next[0]) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  const handleImportExercises = (imported: Exercise[]) => {
    const stamped = imported.map((ex) => ({
      ...ex,
      id: `ex-${Math.random().toString(36).slice(2, 9)}`,
      updatedAt: new Date().toISOString(),
    }));
    setExercises((prev) => [...stamped, ...prev]);
    if (stamped[0]) setActiveId(stamped[0].id);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(exercises, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lexis-studio-exercises.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    const htmlContent = buildStandaloneHtml(activeExercise, a11y);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const slug = (activeExercise.title || 'exercise')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'exercise'}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
        {/* Zone 1: Single text element wordmark */}
        <span
          className="text-xl font-bold tracking-tight whitespace-nowrap shrink-0"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        >
          Lexis Studio
        </span>

        {/* Zone 2: Concise single-line text nav links */}
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
            onClick={handleExportHtml}
            className="hover:underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            Export HTML
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
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
        className="no-print flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
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
            onChange={(e) => setActiveId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border max-w-[20rem] sm:max-w-[26rem] truncate cursor-pointer"
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
                  {m?.partLabel} ({m?.shortTitle}) — {ex.title || 'Untitled'}
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
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile quick links */}
          <button
            type="button"
            onClick={() => setLibraryModal({ open: true, tab: 'create' })}
            className="md:hidden px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            + New
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
              onClick={() =>
                setA11y((s) => ({ ...s, fontSize: Math.max(14, s.fontSize - 1) }))
              }
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
              onClick={() =>
                setA11y((s) => ({ ...s, fontSize: Math.min(28, s.fontSize + 1) }))
              }
              className="px-2 py-1.5 cursor-pointer hover:opacity-75"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Increase text size"
              title="Increase text size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Theme Swatches */}
          <div className="hidden sm:flex items-center gap-1.5" role="group" aria-label="Quick colour themes">
            {Object.values(THEME_PALETTES).map((t) => {
              const active = a11y.theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setA11y((s) => ({ ...s, theme: t.id }))}
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
          />
        ) : (
          <PresenterWorkspace
            exercise={activeExercise}
            splitRatio={a11y.splitRatio}
          />
        )}
      </main>

      {/* Modals */}
      <AccessibilityPanel
        open={a11yOpen}
        onClose={() => setA11yOpen(false)}
        settings={a11y}
        onChange={setA11y}
        onReset={() => setA11y(DEFAULT_A11Y)}
      />

      <ExerciseLibraryModal
        open={libraryModal.open}
        initialTab={libraryModal.tab}
        onClose={() => setLibraryModal((s) => ({ ...s, open: false }))}
        exercises={exercises}
        activeExerciseId={activeExercise.id}
        onSelectExercise={(id) => setActiveId(id)}
        onCreateExercise={handleCreateExercise}
        onDuplicateExercise={handleDuplicateExercise}
        onDeleteExercise={handleDeleteExercise}
        onImportExercises={handleImportExercises}
        onExportJson={handleExportJson}
      />
    </div>
  );
}
