import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Download,
  ExternalLink,
  QrCode,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
} from '../types/exercise';
import { stripExerciseAnswers } from '../utils/stripAnswers';

interface ShareQrModalProps {
  open: boolean;
  exercise: Exercise | null;
  a11y: AccessibilitySettings;
  onClose: () => void;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  open,
  exercise,
  a11y,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [qrPngUrl, setQrPngUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!open || !exercise) return;
    let cancelled = false;

    const generate = async () => {
      setLoading(true);
      setError(null);
      setCopied(false);

      try {
        const stripped = stripExerciseAnswers(exercise);
        const res = await fetch('/api/shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exercise: stripped, a11y }),
        });
        if (!res.ok) {
          throw new Error('Failed to create share link.');
        }
        const data = (await res.json()) as { id?: string };
        if (!data.id) {
          throw new Error('Missing share ID.');
        }

        const url = `${window.location.origin}/?share=${encodeURIComponent(data.id)}`;
        const [svg, png] = await Promise.all([
          QRCode.toString(url, {
            type: 'svg',
            margin: 2,
            width: 240,
            errorCorrectionLevel: 'M',
            color: { dark: '#111827', light: '#FFFFFF' },
          }),
          QRCode.toDataURL(url, {
            margin: 2,
            width: 640,
            errorCorrectionLevel: 'M',
            color: { dark: '#111827', light: '#FFFFFF' },
          }),
        ]);

        if (cancelled) return;
        setShareUrl(url);
        setQrSvg(svg);
        setQrPngUrl(png);
      } catch {
        if (!cancelled) {
          setError('Could not generate the share link. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [open, exercise, a11y, refreshNonce]);

  if (!open || !exercise) return null;

  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type);
  const slug = (exercise.title || 'exercise')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback selection handled via input if clipboard blocked
    }
  };

  const handleDownloadPng = () => {
    if (!qrPngUrl) return;
    const a = document.createElement('a');
    a.href = qrPngUrl;
    a.download = `${slug || 'exercise'}-qr.png`;
    a.click();
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
        aria-labelledby="share-qr-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode className="w-5 h-5 shrink-0" style={{ color: 'var(--accent-fg)' }} />
            <h2
              id="share-qr-title"
              className="text-base font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Share Exercise via QR Code
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg cursor-pointer hover:opacity-75"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            className="p-3 rounded-lg border flex items-start gap-2.5"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <ShieldCheck
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: 'var(--success-fg)' }}
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {exercise.title || 'Untitled Exercise'}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {meta?.title} · Answer key and explanations are completely excluded from this copy.
              </div>
            </div>
          </div>

          {loading ? (
            <div
              className="h-64 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Generating QR code...</span>
            </div>
          ) : error ? (
            <div
              className="p-4 rounded-xl border text-center space-y-3"
              style={{
                backgroundColor: 'var(--error-bg)',
                borderColor: 'var(--error-fg)',
                color: 'var(--error-fg)',
              }}
            >
              <p className="text-xs font-medium">{error}</p>
              <button
                type="button"
                onClick={() => setRefreshNonce((n) => n + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--error-fg)',
                  color: 'var(--error-fg)',
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div
                  className="p-4 rounded-xl border bg-white shadow-sm inline-flex items-center justify-center"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div
                    className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                    aria-label="Scannable QR code for student copy"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="share-qr-url-input"
                  className="block text-xs font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Direct Device Link (No Answer Key)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="share-qr-url-input"
                    type="text"
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono rounded-lg border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--accent-bg)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR PNG</span>
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Copy</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
