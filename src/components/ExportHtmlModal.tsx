import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, Download } from 'lucide-react';

interface ExportHtmlModalProps {
  open: boolean;
  targetLabel: string;
  targetDescription: string;
  onClose: () => void;
  onConfirmExport: (password: string) => void;
}

export const ExportHtmlModal: React.FC<ExportHtmlModalProps> = ({
  open,
  targetLabel,
  targetDescription,
  onClose,
  onConfirmExport,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setError('Please enter a password to protect the answer key.');
      return;
    }
    setError(null);
    onConfirmExport(trimmed);
    setPassword('');
    onClose();
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
        aria-labelledby="export-html-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4" style={{ color: 'var(--accent-fg)' }} />
            <h2
              id="export-html-title"
              className="text-base font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Export Protected HTML
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer hover:opacity-75"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {targetLabel}
            </div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {targetDescription}
            </p>
          </div>

          <div>
            <label
              htmlFor="export-password-input"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Answer Key Password (required)
            </label>
            <div className="relative flex items-center">
              <input
                id="export-password-input"
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password to lock answers..."
                className="w-full pl-3 pr-10 py-2 text-sm rounded-lg border outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: error ? 'var(--error-fg)' : 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2.5 p-1 rounded cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs font-medium mt-1.5" style={{ color: 'var(--error-fg)' }}>
                {error}
              </p>
            )}
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              The answer key is encrypted inside the HTML file and stays hidden until this password is entered.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium border cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-text)',
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Export HTML File
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
