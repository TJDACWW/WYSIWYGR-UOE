import React, { useMemo, useRef, useState } from 'react';
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
  Search,
  FolderInput,
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
  onBulkMoveExercises: (exerciseIds: string[], folderId?: string) => void;
  onBulkDeleteExercises: (exerciseIds: string[]) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string, deleteExercises: boolean) => void;
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
  onBulkMoveExercises,
  onBulkDeleteExercises,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ExerciseType | 'all'>('all');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [createTargetFolderId, setCreateTargetFolderId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState<string>('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setTab(initialTab);
      setImportError(null);
      setEditingFolderId(null);
      setConfirmBulkDelete(false);
      setConfirmDeleteFolderId(null);
    }
  }, [open, initialTab]);

  const exerciseIdSet = useMemo(
    () => new Set(exercises.map((e) => e.id)),
    [exercises]
  );

  const validSelectedIds = useMemo(
    () => Array.from(selectedIds).filter((id) => exerciseIdSet.has(id)),
    [selectedIds, exerciseIdSet]
  );

  const validSelectedSet = useMemo(
    () => new Set(validSelectedIds),
    [validSelectedIds]
  );

  const folderNameById = useMemo(
    () => new Map(folders.map((f) => [f.id, f.name])),
    [folders]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (filterType !== 'all' && ex.type !== filterType) return false;
      if (!normalizedQuery) return true;

      const meta = EXERCISE_TYPES.find((m) => m.type === ex.type);
      const folderName =
        ex.folderId && folderNameById.has(ex.folderId)
          ? folderNameById.get(ex.folderId)!
          : 'Unfiled';

      const haystack = [
        ex.title || '',
        ex.subtitle || '',
        meta?.title || '',
        meta?.partLabel || '',
        ex.type,
        folderName,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [exercises, filterType, normalizedQuery, folderNameById]);

  if (!open) return null;

  const toggleSelectOne = (id: string) => {
    setConfirmBulkDelete(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectGroup = (groupExercises: Exercise[]) => {
    setConfirmBulkDelete(false);
    const groupIds = groupExercises.map((e) => e.id);
    if (groupIds.length === 0) return;
    const allSelected = groupIds.every((id) => validSelectedSet.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

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
          (item: Exercise) =>
            item && typeof item.type === 'string' && typeof item.title === 'string'
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
        (item) =>
          item && typeof item.type === 'string' && typeof item.title === 'string'
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
    const isSelected = validSelectedSet.has(ex.id);

    return (
      <div
        key={ex.id}
        className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 transition-colors"
        style={{
          backgroundColor: isSelected
            ? 'var(--accent-soft)'
            : isActive
              ? 'var(--bg-elevated)'
              : 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelectOne(ex.id)}
            aria-label={`Select ${ex.title || 'Untitled Exercise'}`}
            className="w-4 h-4 rounded cursor-pointer shrink-0"
            style={{ accentColor: 'var(--accent-fg)' }}
          />
          <button
            type="button"
            onClick={() => {
              onSelectExercise(ex.id);
              onClose();
            }}
            className="flex-1 text-left min-w-0 cursor-pointer"
          >
            <div
              className="flex items-center gap-2 text-xs mb-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{meta?.title}</span>
              {isActive && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--accent-fg)' }}
                  >
                    Currently Open
                  </span>
                </>
              )}
            </div>
            <div
              className="text-sm sm:text-base font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {ex.title || 'Untitled Exercise'}
            </div>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
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
        </div>
      </div>
    );
  };

  const validFolderIds = new Set(folders.map((f) => f.id));
  const unfiledExercises = filtered.filter(
    (ex) => !ex.folderId || !validFolderIds.has(ex.folderId)
  );
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((ex) => validSelectedSet.has(ex.id));

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
                      <span
                        className="text-base font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {meta.title}
                      </span>
                      <Plus
                        className="w-4 h-4 opacity-70 group-hover:opacity-100 shrink-0"
                        style={{ color: 'var(--accent-fg)' }}
                      />
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {meta.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <Search
                  className="w-4 h-4 absolute left-3 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises by title, type, or folder name..."
                  aria-label="Search exercises by title, type, or folder name"
                  className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 p-1 rounded cursor-pointer hover:opacity-75"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Top Controls: Create Folder + Filter + Select Visible + Import/Export */}
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
                  {filtered.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleSelectGroup(filtered)}
                      className="px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {allFilteredSelected ? 'Deselect All' : 'Select All Visible'}
                    </button>
                  )}

                  <select
                    aria-label="Filter by exercise format"
                    value={filterType}
                    onChange={(e) =>
                      setFilterType(e.target.value as ExerciseType | 'all')
                    }
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

              {/* Bulk Selection Action Bar */}
              {validSelectedIds.length > 0 && (
                <div
                  className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-sm"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--accent-border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold"
                      style={{ color: 'var(--accent-fg)' }}
                    >
                      {validSelectedIds.length}{' '}
                      {validSelectedIds.length === 1 ? 'exercise' : 'exercises'} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds(new Set());
                        setConfirmBulkDelete(false);
                      }}
                      className="text-xs underline underline-offset-2 cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label="Destination folder for selected exercises"
                        value={bulkTargetFolderId}
                        onChange={(e) => setBulkTargetFolderId(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border cursor-pointer max-w-[11rem] truncate"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
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
                      <button
                        type="button"
                        onClick={() => {
                          onBulkMoveExercises(
                            validSelectedIds,
                            bulkTargetFolderId || undefined
                          );
                          setSelectedIds(new Set());
                          setConfirmBulkDelete(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: 'var(--accent-bg)',
                          color: 'var(--accent-text)',
                        }}
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                        Move Selected
                      </button>
                    </div>

                    {confirmBulkDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onBulkDeleteExercises(validSelectedIds);
                            setSelectedIds(new Set());
                            setConfirmBulkDelete(false);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap border"
                          style={{
                            backgroundColor: 'var(--error-bg)',
                            borderColor: 'var(--error-fg)',
                            color: 'var(--error-fg)',
                          }}
                        >
                          Confirm Delete ({validSelectedIds.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmBulkDelete(false)}
                          className="px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-panel)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmBulkDelete(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                          borderColor: 'var(--error-fg)',
                          color: 'var(--error-fg)',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Selected
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                const folderNameMatches =
                  normalizedQuery !== '' &&
                  folder.name.toLowerCase().includes(normalizedQuery);

                // During active search/filter, hide non-matching folders unless folder name matches when format filter is 'all'
                if (
                  (normalizedQuery !== '' || filterType !== 'all') &&
                  folderEx.length === 0 &&
                  !(folderNameMatches && filterType === 'all')
                ) {
                  return null;
                }

                const isRenaming = editingFolderId === folder.id;
                const isCollapsed =
                  normalizedQuery === '' && collapsedFolderIds.includes(folder.id);
                const isConfirmingDelete = confirmDeleteFolderId === folder.id;
                const allFolderVisibleSelected =
                  folderEx.length > 0 &&
                  folderEx.every((ex) => validSelectedSet.has(ex.id));

                return (
                  <div
                    key={folder.id}
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div
                      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${
                        isCollapsed && !isConfirmingDelete ? '' : 'border-b'
                      }`}
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {folderEx.length > 0 && (
                          <input
                            type="checkbox"
                            checked={allFolderVisibleSelected}
                            onChange={() => toggleSelectGroup(folderEx)}
                            aria-label={`Select all exercises in ${folder.name}`}
                            className="w-4 h-4 rounded cursor-pointer shrink-0"
                            style={{ accentColor: 'var(--accent-fg)' }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleFolderCollapse(folder.id)}
                          className="p-1 rounded cursor-pointer hover:opacity-75 shrink-0"
                          style={{ color: 'var(--text-secondary)' }}
                          aria-expanded={!isCollapsed}
                          aria-label={
                            isCollapsed
                              ? `Expand folder ${folder.name}`
                              : `Collapse folder ${folder.name}`
                          }
                          title={isCollapsed ? 'Expand folder' : 'Collapse folder'}
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        <Folder
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent-fg)' }}
                        />
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
                            <span
                              className="text-xs font-mono tabular-nums"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              ({normalizedQuery || filterType !== 'all'
                                ? `${folderEx.length}/${allFolderEx.length}`
                                : allFolderEx.length})
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
                              onClick={() =>
                                onExportFolderHtml(folder.name, allFolderEx)
                              }
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
                              onClick={() =>
                                onExportFolderJson(folder.name, allFolderEx)
                              }
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
                          onClick={() => {
                            if (allFolderEx.length === 0) {
                              onDeleteFolder(folder.id, false);
                            } else {
                              setConfirmDeleteFolderId((cur) =>
                                cur === folder.id ? null : folder.id
                              );
                            }
                          }}
                          className="p-1.5 rounded-lg border cursor-pointer"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--error-fg)',
                          }}
                          title="Delete folder"
                          aria-label={`Delete folder ${folder.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isConfirmingDelete && (
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b text-xs"
                        style={{
                          backgroundColor: 'var(--error-bg)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span className="font-medium">
                          Delete folder &ldquo;{folder.name}&rdquo; ({allFolderEx.length}{' '}
                          {allFolderEx.length === 1 ? 'exercise' : 'exercises'})?
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteFolder(folder.id, true);
                              setConfirmDeleteFolderId(null);
                            }}
                            className="px-2.5 py-1 rounded-md font-semibold cursor-pointer border"
                            style={{
                              backgroundColor: 'var(--bg-panel)',
                              borderColor: 'var(--error-fg)',
                              color: 'var(--error-fg)',
                            }}
                          >
                            Delete Folder &amp; Exercises
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteFolder(folder.id, false);
                              setConfirmDeleteFolderId(null);
                            }}
                            className="px-2.5 py-1 rounded-md font-medium cursor-pointer border"
                            style={{
                              backgroundColor: 'var(--bg-panel)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Keep Exercises (Unfile)
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteFolderId(null)}
                            className="px-2.5 py-1 rounded-md font-medium cursor-pointer"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!isCollapsed &&
                      (folderEx.length === 0 ? (
                        <div
                          className="p-4 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          No exercises in this folder yet. Use the folder selector or
                          selection checkboxes to move exercises here.
                        </div>
                      ) : (
                        <div
                          className="divide-y"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          {folderEx.map(renderExerciseRow)}
                        </div>
                      ))}
                  </div>
                );
              })}

              {/* Unfiled Exercises Section */}
              {(normalizedQuery === '' || unfiledExercises.length > 0) &&
                (() => {
                  const unfiledCollapsed =
                    normalizedQuery === '' &&
                    collapsedFolderIds.includes('__unfiled__');
                  const allUnfiledSelected =
                    unfiledExercises.length > 0 &&
                    unfiledExercises.every((ex) => validSelectedSet.has(ex.id));

                  return (
                    <div
                      className="rounded-xl border overflow-hidden"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div
                        className={`flex items-center justify-between px-4 py-3 ${
                          unfiledCollapsed ? '' : 'border-b'
                        }`}
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {unfiledExercises.length > 0 && (
                            <input
                              type="checkbox"
                              checked={allUnfiledSelected}
                              onChange={() => toggleSelectGroup(unfiledExercises)}
                              aria-label="Select all unfiled exercises"
                              className="w-4 h-4 rounded cursor-pointer shrink-0"
                              style={{ accentColor: 'var(--accent-fg)' }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleFolderCollapse('__unfiled__')}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-left cursor-pointer"
                            style={{ color: 'var(--text-primary)' }}
                            aria-expanded={!unfiledCollapsed}
                          >
                            {unfiledCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <span>
                              {folders.length > 0 ? 'Unfiled Exercises' : 'All Exercises'}{' '}
                              ({unfiledExercises.length})
                            </span>
                          </button>
                        </div>
                      </div>

                      {!unfiledCollapsed &&
                        (unfiledExercises.length === 0 ? (
                          <div
                            className="p-4 text-xs"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {exercises.length === 0
                              ? 'No exercises yet. Switch to "New Exercise" or import JSON to get started.'
                              : 'No exercises match this filter.'}
                          </div>
                        ) : (
                          <div
                            className="divide-y"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            {unfiledExercises.map(renderExerciseRow)}
                          </div>
                        ))}
                    </div>
                  );
                })()}

              {/* Search empty state when nothing matched across folders + unfiled */}
              {normalizedQuery !== '' && filtered.length === 0 && (
                <div
                  className="p-6 rounded-xl border text-center text-sm"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  No exercises matched &ldquo;{searchQuery.trim()}&rdquo;.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
