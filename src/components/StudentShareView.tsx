import React, { useEffect, useState } from 'react';
import { Minus, Plus, SlidersHorizontal, RefreshCw, AlertCircle } from 'lucide-react';
import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
  THEME_PALETTES,
} from '../types/exercise';
import { PresenterWorkspace } from './PresenterWorkspace';
import { AccessibilityPanel } from './AccessibilityPanel';

interface StudentShareViewProps {
  shareId: string;
}

const DEFAULT_STUDENT_A11Y: AccessibilitySettings = {
  theme: 'paper-light',
  fontSize: 18,
  lineHeight: 1.65,
  fontFamily: 'sans',
  splitRatio: 50,
};

const STUDENT_A11Y_KEY = 'wysiwygr_student_a11y_v1';

export const StudentShareView: React.FC<StudentShareViewProps> = ({ shareId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [a11yOpen, setA11yOpen] = useState(false);
  const [a11y, setA11y] = useState<AccessibilitySettings>(() => {
    try {
      const raw = localStorage.getItem(STUDENT_A11Y_KEY);
      if (raw) {
        return { ...DEFAULT_STUDENT_A11Y, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_STUDENT_A11Y;
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/shares/${encodeURIComponent(shareId)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'This shared exercise link was not found or is no longer available.'
              : 'Could not load the shared exercise.'
          );
        }
        return res.json();
      })
      .then((data: { exercise?: Exercise; a11y?: Partial<AccessibilitySettings> }) => {
        if (cancelled) return;
        if (!data.exercise) {
          throw new Error('Invalid shared exercise data.');
        }
        setExercise(data.exercise);
        // Only apply teacher defaults if student hasn't saved custom display prefs yet
        const hasStudentPref = Boolean(localStorage.getItem(STUDENT_A11Y_KEY));
        if (!hasStudentPref && data.a11y) {
          setA11y({ ...DEFAULT_STUDENT_A11Y, ...data.a11y });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load the shared exercise.'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const updateA11y = (
    updater:
      | AccessibilitySettings
      | ((prev: AccessibilitySettings) => AccessibilitySettings)
  ) => {
    setA11y((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STUDENT_A11Y_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const palette = THEME_PALETTES[a11y.theme] || THEME_PALETTES['paper-light'];

  useEffect(() => {
    const root = document.documentElement;
    if (palette.isDark) root.classList.add('dark');
    else root.classList.remove('dark');
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

  const meta = exercise
    ? EXERCISE_TYPES.find((m) => m.type === exercise.type)
    : null;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        ...themeCssVars,
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            WYSIWYGR&amp;UOE
          </span>
          {exercise && (
            <>
              <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                ·
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {exercise.title || 'Shared Exercise'}
                </div>
                {meta && (
                  <div
                    className="text-[11px] truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {meta.title}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
                updateA11y((s) => ({
                  ...s,
                  fontSize: Math.max(14, s.fontSize - 1),
                }))
              }
              className="px-2 py-1.5 cursor-pointer hover:opacity-75"
              aria-label="Decrease text size"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span
              className="px-2 text-xs font-mono font-semibold tabular-nums"
              style={{ color: 'var(--text-secondary)' }}
            >
              {a11y.fontSize}px
            </span>
            <button
              type="button"
              onClick={() =>
                updateA11y((s) => ({
                  ...s,
                  fontSize: Math.min(28, s.fontSize + 1),
                }))
              }
              className="px-2 py-1.5 cursor-pointer hover:opacity-75"
              aria-label="Increase text size"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

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
                  onClick={() => updateA11y((s) => ({ ...s, theme: t.id }))}
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
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-fg)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Loading shared exercise...
            </span>
          </div>
        ) : error || !exercise ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className="max-w-md w-full rounded-xl border p-6 text-center space-y-3"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <AlertCircle
                className="w-8 h-8 mx-auto"
                style={{ color: 'var(--error-fg)' }}
              />
              <h1 className="text-lg font-semibold">Exercise Unavailable</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {error || 'Could not load this shared exercise.'}
              </p>
            </div>
          </div>
        ) : (
          <PresenterWorkspace
            exercise={exercise}
            studentMode={true}
            storageKey={`wysiwygr_student_share_${shareId}`}
            splitRatio={a11y.splitRatio}
            onSplitRatioChange={(ratio) =>
              updateA11y((s) => ({ ...s, splitRatio: ratio }))
            }
          />
        )}
      </main>

      <AccessibilityPanel
        open={a11yOpen}
        onClose={() => setA11yOpen(false)}
        settings={a11y}
        onChange={updateA11y}
        onReset={() => updateA11y(DEFAULT_STUDENT_A11Y)}
      />
    </div>
  );
};
