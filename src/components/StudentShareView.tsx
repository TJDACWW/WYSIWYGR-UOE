import React, { useEffect, useState } from 'react';
import {
  Minus,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  AlertCircle,
  Download,
  BookmarkCheck,
  Trash2,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
  THEME_PALETTES,
} from '../types/exercise';
import { PresenterWorkspace } from './PresenterWorkspace';
import { AccessibilityPanel } from './AccessibilityPanel';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { decompressExerciseFromToken } from '../utils/offlineShare';
import { buildStudentOfflineHtml } from '../utils/htmlExporter';
import {
  SavedStudentExercise,
  computeStudentStorageKey,
  deleteSavedStudentExercise,
  listSavedStudentExercises,
  markLastRole,
  saveStudentExercise,
} from '../utils/studentOfflineStore';

interface StudentShareViewProps {
  shareId?: string | null;
  offlineToken?: string | null;
  onSwitchToTeacher?: () => void;
}

const DEFAULT_STUDENT_A11Y: AccessibilitySettings = {
  theme: 'paper-light',
  fontSize: 18,
  lineHeight: 1.65,
  fontFamily: 'sans',
  splitRatio: 50,
};

const STUDENT_A11Y_KEY = 'wysiwygr_student_a11y_v1';

export const StudentShareView: React.FC<StudentShareViewProps> = ({
  shareId,
  offlineToken,
  onSwitchToTeacher,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [activeStorageKey, setActiveStorageKey] = useState<string | undefined>(
    undefined
  );
  const [savedList, setSavedList] = useState<SavedStudentExercise[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
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

    if (offlineToken) {
      decompressExerciseFromToken(offlineToken)
        .then(async (decoded) => {
          if (cancelled) return;
          if (!decoded) {
            setError('Could not read the shared offline exercise link.');
          } else {
            const key = computeStudentStorageKey(decoded, null, offlineToken);
            setExercise(decoded);
            setActiveStorageKey(key);
            const updated = await saveStudentExercise(decoded, key, 'qr-offline');
            if (!cancelled) setSavedList(updated);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not read the shared offline exercise link.');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    if (shareId) {
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
        .then(
          async (data: {
            exercise?: Exercise;
            a11y?: Partial<AccessibilitySettings>;
          }) => {
            if (cancelled) return;
            if (!data.exercise) {
              throw new Error('Invalid shared exercise data.');
            }
            const key = computeStudentStorageKey(data.exercise, shareId, null);
            setExercise(data.exercise);
            setActiveStorageKey(key);
            const hasStudentPref = Boolean(localStorage.getItem(STUDENT_A11Y_KEY));
            if (!hasStudentPref && data.a11y) {
              setA11y({ ...DEFAULT_STUDENT_A11Y, ...data.a11y });
            }
            const updated = await saveStudentExercise(
              data.exercise,
              key,
              'server-share'
            );
            if (!cancelled) setSavedList(updated);
          }
        )
        .catch(async (err: unknown) => {
          if (cancelled) return;
          // If offline and this shareId was cached before, fall back to cached copy!
          const cached = await listSavedStudentExercises();
          if (cancelled) return;
          setSavedList(cached);
          const matching = cached.find(
            (item) => item.storageKey === `wysiwygr_student_share_${shareId}`
          );
          if (matching) {
            setExercise(matching.exercise);
            setActiveStorageKey(matching.storageKey);
            setError(null);
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'Could not load the shared exercise.'
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    // Standalone PWA launch (no #offline= or ?share=): load cached student library
    listSavedStudentExercises()
      .then((cached) => {
        if (cancelled) return;
        setSavedList(cached);
        if (cached.length > 0) {
          setExercise(cached[0].exercise);
          setActiveStorageKey(cached[0].storageKey);
        } else {
          setError('No cached exercises saved on this device yet.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shareId, offlineToken]);

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

  const handleSaveOfflineHtml = () => {
    if (!exercise) return;
    const html = buildStudentOfflineHtml(exercise, a11y);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const slug = (exercise.title || 'exercise')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'exercise'}-offline-copy.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSelectSaved = async (item: SavedStudentExercise) => {
    setExercise(item.exercise);
    setActiveStorageKey(item.storageKey);
    setError(null);
    setSavedOpen(false);
    const updated = await saveStudentExercise(
      item.exercise,
      item.storageKey,
      item.source
    );
    setSavedList(updated);
  };

  const handleDeleteSaved = async (
    e: React.MouseEvent,
    storageKey: string
  ) => {
    e.stopPropagation();
    const updated = await deleteSavedStudentExercise(storageKey);
    setSavedList(updated);
    if (activeStorageKey === storageKey) {
      if (updated.length > 0) {
        setExercise(updated[0].exercise);
        setActiveStorageKey(updated[0].storageKey);
      } else {
        setExercise(null);
        setActiveStorageKey(undefined);
        setError('No cached exercises saved on this device.');
      }
    }
  };

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
        className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b shrink-0"
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
                <div className="text-sm font-semibold truncate max-w-[12rem] sm:max-w-[20rem]">
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

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <PWAInstallButton />

          <button
            type="button"
            onClick={() => setSavedOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            title="View exercises cached offline on this device"
          >
            <BookmarkCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Saved ({savedList.length})</span>
          </button>

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
              className="px-2 py-1.5 min-h-[36px] cursor-pointer hover:opacity-75"
              aria-label="Decrease text size"
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
                updateA11y((s) => ({
                  ...s,
                  fontSize: Math.min(28, s.fontSize + 1),
                }))
              }
              className="px-2 py-1.5 min-h-[36px] cursor-pointer hover:opacity-75"
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

          {exercise && (
            <button
              type="button"
              onClick={handleSaveOfflineHtml}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              title="Download standalone offline HTML copy (no answer key)"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Save HTML</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setA11yOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Display</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-sm">
            <RefreshCw
              className="w-6 h-6 animate-spin"
              style={{ color: 'var(--accent-fg)' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              Loading shared exercise...
            </span>
          </div>
        ) : error || !exercise ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className="max-w-md w-full rounded-xl border p-6 text-center space-y-4"
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
              {onSwitchToTeacher && (
                <button
                  type="button"
                  onClick={() => {
                    markLastRole('teacher');
                    onSwitchToTeacher();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--accent-bg)',
                    color: 'var(--accent-text)',
                  }}
                >
                  <span>Open Teacher Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <PresenterWorkspace
            key={activeStorageKey || exercise.id}
            exercise={exercise}
            studentMode={true}
            storageKey={activeStorageKey}
            splitRatio={a11y.splitRatio}
            onSplitRatioChange={(ratio) =>
              updateA11y((s) => ({ ...s, splitRatio: ratio }))
            }
          />
        )}
      </main>

      {/* Saved Offline Exercises Drawer / Modal */}
      {savedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
          onClick={() => setSavedOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="saved-offline-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full border-l shadow-2xl flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-primary)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <h2
                  id="saved-offline-title"
                  className="text-base font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Saved Offline Exercises
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Cached on this device for offline reading (no answer keys).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSavedOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg cursor-pointer hover:opacity-75"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Close saved exercises"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {savedList.length === 0 ? (
                <div
                  className="p-6 text-center text-sm rounded-xl border"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Any shared exercise you scan or open is saved here automatically for offline study.
                </div>
              ) : (
                savedList.map((item) => {
                  const isActive = item.storageKey === activeStorageKey;
                  const itemMeta = EXERCISE_TYPES.find(
                    (m) => m.type === item.exercise.type
                  );
                  const dateLabel = new Date(
                    item.lastOpenedAt || item.savedAt
                  ).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={item.storageKey}
                      onClick={() => handleSelectSaved(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectSaved(item);
                        }
                      }}
                      className="flex items-center justify-between gap-2 p-3 min-h-[56px] rounded-xl border cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isActive
                          ? 'var(--accent-soft)'
                          : 'var(--bg-elevated)',
                        borderColor: isActive
                          ? 'var(--accent-border)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">
                          {item.exercise.title || 'Untitled Exercise'}
                        </div>
                        <div
                          className="text-xs truncate mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {itemMeta?.title || 'Exercise'} · Saved {dateLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSaved(e, item.storageKey)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg cursor-pointer hover:opacity-75 shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label={`Remove ${item.exercise.title || 'exercise'} from offline cache`}
                        title="Remove from offline cache"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {onSwitchToTeacher && (
              <div
                className="p-4 border-t shrink-0"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    markLastRole('teacher');
                    setSavedOpen(false);
                    onSwitchToTeacher();
                  }}
                  className="w-full min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Switch to Teacher Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AccessibilityPanel
        open={a11yOpen}
        onClose={() => setA11yOpen(false)}
        settings={a11y}
        onChange={updateA11y}
        onReset={() => updateA11y(DEFAULT_STUDENT_A11Y)}
      />

      <OfflineIndicator />
    </div>
  );
};
