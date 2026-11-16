import React, { useRef, useState } from 'react';
import { X, Plus, Copy, Trash2, Upload, Download } from 'lucide-react';
import { EXERCISE_TYPES, Exercise, ExerciseType } from '../types/exercise';

interface ExerciseLibraryModalProps {
  open: boolean;
  initialTab: 'library' | 'create';
  onClose: () => void;
  exercises: Exercise[];
  activeExerciseId: string;
  onSelectExercise: (id: string) => void;
  onCreateExercise: (type: ExerciseType) => void;
  onDuplicateExercise: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  onImportExercises: (imported: Exercise[]) => void;
  onExportJson: () => void;
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  open,
  initialTab,
  onClose,
  exercises,
  activeExerciseId,
  onSelectExercise,
  onCreateExercise,
  onDuplicateExercise,
  onDeleteExercise,
  onImportExercises,
  onExportJson,
}) => {
  const [tab, setTab] = useState<'library' | 'create'>(initialTab);
  const [filterType, setFilterType] = useState<ExerciseType | 'all'>('all');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTab(initialTab);
      setImportError(null);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const filtered =
    filterType === 'all'
      ? exercises
      : exercises.filter((ex) => ex.type === filterType);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const valid = arr.filter((item) => item && typeof item.type === 'string' && typeof item.title === 'string');
      if (valid.length === 0) {
        setImportError('No valid exercises found in this JSON file.');
        return;
      }
      onImportExercises(valid as Exercise[]);
      setImportError(null);
      setTab('library');
    } catch {
      setImportError('Could not read JSON file. Please verify the format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-6">
            <h2
              id="library-dialog-title"
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Exercise Workspace
            </h2>
            <div
              className="flex items-center gap-1 p-1 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setTab('library')}
                className="px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: tab === 'library' ? 'var(--bg-panel)' : 'transparent',
                  color: tab === 'library' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Saved Exercises ({exercises.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('create')}
                className="px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: tab === 'create' ? 'var(--bg-panel)' : 'transparent',
                  color: tab === 'create' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                New Exercise (8 Types)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg cursor-pointer hover:opacity-75"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto exercise-scroll flex-1">
          {tab === 'create' ? (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Choose one of the 8 exercise formats below to start authoring in the WYSIWYG workspace.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {EXERCISE_TYPES.map((meta) => (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => {
                      onCreateExercise(meta.type);
                      onClose();
                    }}
                    className="group text-left p-4 rounded-xl border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: 'var(--accent-fg)' }}
                      >
                        {meta.partLabel}
                      </span>
                      <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100" style={{ color: 'var(--accent-fg)' }} />
                    </div>
                    <div className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {meta.title}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {meta.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="library-filter" className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Filter format:
                  </label>
                  <select
                    id="library-filter"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as ExerciseType | 'all')}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="all">All 8 Formats</option>
                    {EXERCISE_TYPES.map((m) => (
                      <option key={m.type} value={m.type}>
                        {m.partLabel} — {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import JSON
                  </button>
                  <button
                    type="button"
                    onClick={onExportJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Backup JSON
                  </button>
                </div>
              </div>

              {importError && (
                <div
                  className="p-3 rounded-lg border text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--error-bg)',
                    borderColor: 'var(--error-fg)',
                    color: 'var(--error-fg)',
                  }}
                >
                  {importError}
                </div>
              )}

              <div className="divide-y rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                {filtered.map((ex) => {
                  const meta = EXERCISE_TYPES.find((m) => m.type === ex.type);
                  const isActive = ex.id === activeExerciseId;
                  return (
                    <div
                      key={ex.id}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--bg-panel)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectExercise(ex.id);
                          onClose();
                        }}
                        className="flex-1 text-left min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-mono font-semibold" style={{ color: 'var(--accent-fg)' }}>
                            {meta?.partLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{meta?.title}</span>
                          {isActive && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold" style={{ color: 'var(--accent-fg)' }}>
                                Currently Open
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {ex.title || 'Untitled Exercise'}
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectExercise(ex.id);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                          style={{
                            backgroundColor: isActive ? 'var(--accent-bg)' : 'var(--bg-elevated)',
                            color: isActive ? 'var(--accent-text)' : 'var(--text-primary)',
                          }}
                        >
                          {isActive ? 'Open' : 'Load'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateExercise(ex.id)}
                          className="p-2 rounded-lg border cursor-pointer"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                          title="Duplicate exercise"
                          aria-label={`Duplicate ${ex.title}`}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onDeleteExercise(ex.id)}
                            className="p-2 rounded-lg border cursor-pointer"
                            style={{
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--error-fg)',
                            }}
                            title="Delete exercise"
                            aria-label={`Delete ${ex.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
