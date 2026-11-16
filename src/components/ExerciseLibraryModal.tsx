import React, { useRef, useState } from 'react';
import {
  X,
  Plus,
  Copy,
  Trash2,
  Upload,
  Download,
  FolderPlus,
  Folder,
  Pencil,
  Check,
  FileCode2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  EXERCISE_TYPES,
  Exercise,
  ExerciseFolder,
  ExerciseType,
} from '../types/exercise';

interface ExerciseLibraryModalProps {
  open: boolean;
  initialTab: 'library' | 'create';
  onClose: () => void;
  exercises: Exercise[];
  folders: ExerciseFolder[];
  collapsedFolderIds: string[];
  activeExerciseId: string;
  onSelectExercise: (id: string) => void;
  onCreateExercise: (type: ExerciseType, folderId?: string) => void;
  onDuplicateExercise: (id: string) => void;
  onDeleteExercise: (id: string) => void;
  onMoveExerciseToFolder: (exerciseId: string, folderId?: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onToggleFolderCollapse: (folderId: string) => void;
  onExportExerciseHtml: (exercise: Exercise) => void;
  onExportFolderHtml: (folderName: string, folderExercises: Exercise[]) => void;
  onExportFolderJson: (folderName: string, folderExercises: Exercise[]) => void;
  onImportData: (payload: {
    exercises: Exercise[];
    folders?: ExerciseFolder[];
  }) => void;
  onExportAllJson: () => void;
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  open,
  initialTab,
  onClose,
  exercises,
  folders,
  collapsedFolderIds,
  activeExerciseId,
  onSelectExercise,
  onCreateExercise,
  onDuplicateExercise,
  onDeleteExercise,
  onMoveExerciseToFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onToggleFolderCollapse,
  onExportExerciseHtml,
  onExportFolderHtml,
  onExportFolderJson,
  onImportData,
  onExportAllJson,
}) => {
  const [tab, setTab] = useState<'library' | 'create'>(initialTab);
  const [filterType, setFilterType] = useState<ExerciseType | 'all'>('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [createTargetFolderId, setCreateTargetFolderId] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTab(initialTab);
      setImportError(null);
      setEditingFolderId(null);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const filtered =
    filterType === 'all'
      ? exercises
      : exercises.filter((ex) => ex.type === filterType);

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolder(trimmed);
    setNewFolderName('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Handle folder export or full backup bundle or plain array
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.exercises)) {
        const importedFolders: ExerciseFolder[] = Array.isArray(parsed.folders)
          ? parsed.folders
          : parsed.folderName
            ? [
                {
                  id: `fld-${Math.random().toString(36).slice(2, 9)}`,
                  name: String(parsed.folderName),
                  createdAt: new Date().toISOString(),
                },
              ]
            : [];
        const validEx = parsed.exercises.filter(
          (item: Exercise) => item && typeof item.type === 'string' && typeof item.title === 'string'
        );
        if (validEx.length === 0) {
          setImportError('No valid exercises found in this JSON file.');
          return;
        }
        onImportData({ exercises: validEx, folders: importedFolders });
        setImportError(null);
        setTab('library');
        return;
      }

      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const valid = arr.filter(
        (item) => item && typeof item.type === 'string' && typeof item.title === 'string'
      );
      if (valid.length === 0) {
        setImportError('No valid exercises found in this JSON file.');
        return;
      }
      onImportData({ exercises: valid as Exercise[] });
      setImportError(null);
      setTab('library');
    } catch {
      setImportError('Could not read JSON file. Please verify the format.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const renderExerciseRow = (ex: Exercise) => {
    const meta = EXERCISE_TYPES.find((m) => m.type === ex.type);
    const isActive = ex.id === activeExerciseId;

    return (
      <div
        key={ex.id}
        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 transition-colors"
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
          <div className="flex items-center gap-2 text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
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
          <div className="text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {ex.title || 'Untitled Exercise'}
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Move to folder dropdown */}
          <select
            aria-label={`Folder for ${ex.title}`}
            value={ex.folderId || ''}
            onChange={(e) =>
              onMoveExerciseToFolder(ex.id, e.target.value || undefined)
            }
            className="px-2 py-1.5 text-xs rounded-lg border cursor-pointer max-w-[9.5rem] truncate"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <option value="">Unfiled</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

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
            onClick={() => onExportExerciseHtml(ex)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title="Export exercise as password-protected HTML"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>HTML</span>
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
  };

  // Group filtered exercises by folder
  const validFolderIds = new Set(folders.map((f) => f.id));
  const unfiledExercises = filtered.filter(
    (ex) => !ex.folderId || !validFolderIds.has(ex.folderId)
  );

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
        className="w-full max-w-4xl rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
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
          <div className="flex items-center gap-5 flex-wrap">
            <h2
              id="library-dialog-title"
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Exercise Library
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
                Folders & Exercises ({exercises.length})
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
                New Exercise
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
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Choose an exercise format below to create a new exercise.
                </p>
                {folders.length > 0 && (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="create-folder-select"
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Save into folder:
                    </label>
                    <select
                      id="create-folder-select"
                      value={createTargetFolderId}
                      onChange={(e) => setCreateTargetFolderId(e.target.value)}
                      className="px-2.5 py-1.5 text-xs rounded-lg border cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="">Unfiled</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {EXERCISE_TYPES.map((meta) => (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => {
                      onCreateExercise(meta.type, createTargetFolderId || undefined);
                      onClose();
                    }}
                    className="group text-left p-4 rounded-xl border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {meta.title}
                      </span>
                      <Plus className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0" style={{ color: 'var(--accent-fg)' }} />
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {meta.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top Controls: Create Folder + Filter + Import/Export */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <form onSubmit={handleCreateFolderSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder name..."
                    aria-label="New folder name"
                    className="px-3 py-1.5 text-xs rounded-lg border outline-none w-44 sm:w-52"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--accent-bg)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Create Folder
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Filter by exercise format"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as ExerciseType | 'all')}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="all">All Formats</option>
                    {EXERCISE_TYPES.map((m) => (
                      <option key={m.type} value={m.type}>
                        {m.title}
                      </option>
                    ))}
                  </select>

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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
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
                    onClick={onExportAllJson}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Backup All
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

              {/* Folder Sections */}
              {folders.map((folder) => {
                const folderEx = filtered.filter((ex) => ex.folderId === folder.id);
                const allFolderEx = exercises.filter((ex) => ex.folderId === folder.id);
                const isRenaming = editingFolderId === folder.id;
                const isCollapsed = collapsedFolderIds.includes(folder.id);

                return (
                  <div
                    key={folder.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                        isCollapsed ? '' : 'border-b'
                      }`}
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleFolderCollapse(folder.id)}
                          className="p-1 rounded cursor-pointer hover:opacity-75 shrink-0"
                          style={{ color: 'var(--text-secondary)' }}
                          aria-expanded={!isCollapsed}
                          aria-label={isCollapsed ? `Expand folder ${folder.name}` : `Collapse folder ${folder.name}`}
                          title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <Folder className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-fg)' }} />
                        {isRenaming ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (editingFolderName.trim()) {
                                onRenameFolder(folder.id, editingFolderName.trim());
                              }
                              setEditingFolderId(null);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              className="px-2 py-1 text-xs font-semibold rounded border outline-none"
                              style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-strong)',
                                color: 'var(--text-primary)',
                              }}
                            />
                            <button
                              type="submit"
                              className="p-1.5 rounded cursor-pointer"
                              style={{ color: 'var(--accent-fg)' }}
                              aria-label="Save folder name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onToggleFolderCollapse(folder.id)}
                              className="text-sm font-semibold truncate cursor-pointer text-left"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {folder.name}
                            </button>
                            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>
                              ({allFolderEx.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                              }}
                              className="p-1 rounded cursor-pointer hover:opacity-75"
                              style={{ color: 'var(--text-muted)' }}
                              title="Rename folder"
                              aria-label={`Rename folder ${folder.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {allFolderEx.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => onExportFolderHtml(folder.name, allFolderEx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap"
                              style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--accent-fg)',
                              }}
                              title="Export entire folder as password-protected HTML"
                            >
                              <FileCode2 className="w-3.5 h-3.5" />
                              <span>Export Folder HTML</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onExportFolderJson(folder.name, allFolderEx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
                              style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-secondary)',
                              }}
                              title="Export folder as JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>JSON</span>
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteFolder(folder.id)}
                          className="p-1.5 rounded-lg border cursor-pointer"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--error-fg)',
                          }}
                          title="Delete folder (exercises become Unfiled)"
                          aria-label={`Delete folder ${folder.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed &&
                      (folderEx.length === 0 ? (
                        <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          No exercises in this folder yet. Use the folder selector on any exercise below to move it here.
                        </div>
                      ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {folderEx.map(renderExerciseRow)}
                        </div>
                      ))}
                  </div>
                );
              })}

              {/* Unfiled Exercises Section */}
              {(() => {
                const unfiledCollapsed = collapsedFolderIds.includes('__unfiled__');
                return (
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleFolderCollapse('__unfiled__')}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer ${
                        unfiledCollapsed ? '' : 'border-b'
                      }`}
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                      aria-expanded={!unfiledCollapsed}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {unfiledCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span>
                          {folders.length > 0 ? 'Unfiled Exercises' : 'All Exercises'} ({unfiledExercises.length})
                        </span>
                      </span>
                    </button>
                    {!unfiledCollapsed &&
                      (unfiledExercises.length === 0 ? (
                        <div className="p-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          No exercises match this filter.
                        </div>
                      ) : (
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {unfiledExercises.map(renderExerciseRow)}
                        </div>
                      ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
