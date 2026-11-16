import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Download,
  Eye,
  QrCode,
  ShieldCheck,
  RefreshCw,
  WifiOff,
  Globe,
  FileDown,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
} from '../types/exercise';
import { stripExerciseAnswers } from '../utils/stripAnswers';
import {
  buildCompactMinimalHtml,
  compressExerciseToToken,
  formatExerciseAsOfflineText,
  splitTextIntoQrChunks,
} from '../utils/offlineShare';
import { buildStudentOfflineHtml } from '../utils/htmlExporter';
import { PresenterWorkspace } from './PresenterWorkspace';

interface ShareQrModalProps {
  open: boolean;
  exercise: Exercise | null;
  a11y: AccessibilitySettings;
  onClose: () => void;
}

type ShareModeTab = 'offline-qr' | 'web-link' | 'compact-html';

function getRecommendedOrigins(): {
  isDevPreview: boolean;
  currentOrigin: string;
  sharedAppOrigin: string;
} {
  if (typeof window === 'undefined') {
    return { isDevPreview: false, currentOrigin: '', sharedAppOrigin: '' };
  }
  const { origin, protocol, hostname, port } = window.location;
  const isDevPreview = hostname.startsWith('ais-dev-');
  const sharedHostname = isDevPreview
    ? hostname.replace(/^ais-dev-/, 'ais-pre-')
    : hostname;
  const sharedAppOrigin = `${protocol}//${sharedHostname}${port ? `:${port}` : ''}`;
  return {
    isDevPreview,
    currentOrigin: origin,
    sharedAppOrigin,
  };
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  open,
  exercise,
  a11y,
  onClose,
}) => {
  const [tab, setTab] = useState<ShareModeTab>('offline-qr');

  // Offline Text QR state
  const [chunkIndex, setChunkIndex] = useState(0);
  const [offlineQrSvg, setOfflineQrSvg] = useState('');
  const [offlineQrPngUrl, setOfflineQrPngUrl] = useState('');
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // PWA / Web Link QR state
  const originInfo = useMemo(() => getRecommendedOrigins(), [open]);
  const [customOrigin, setCustomOrigin] = useState('');
  const [useSharedOrigin, setUseSharedOrigin] = useState(false);
  const [webMode, setWebMode] = useState<'stateless' | 'server'>('stateless');
  const [compressedToken, setCompressedToken] = useState<string>('');
  const [serverShareId, setServerShareId] = useState<string>('');
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);
  const [webQrSvg, setWebQrSvg] = useState('');
  const [webQrPngUrl, setWebQrPngUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Compact Minimal-CSS HTML QR state
  const [htmlQrSvg, setHtmlQrSvg] = useState('');
  const [htmlQrPngUrl, setHtmlQrPngUrl] = useState('');
  const [htmlQrError, setHtmlQrError] = useState<string | null>(null);
  const [copiedDataUri, setCopiedDataUri] = useState(false);

  // In-app preview state (never opens target="_blank" to avoid cookie blocks)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSplit, setPreviewSplit] = useState(a11y.splitRatio);

  const strippedExercise = useMemo(
    () => (exercise ? stripExerciseAnswers(exercise) : null),
    [exercise]
  );

  const offlineText = useMemo(
    () => (strippedExercise ? formatExerciseAsOfflineText(strippedExercise) : ''),
    [strippedExercise]
  );

  const chunks = useMemo(
    () =>
      strippedExercise
        ? splitTextIntoQrChunks(
            offlineText,
            strippedExercise.title || 'Exercise',
            1200
          )
        : [],
    [offlineText, strippedExercise]
  );

  const compactHtml = useMemo(
    () => (strippedExercise ? buildCompactMinimalHtml(strippedExercise) : null),
    [strippedExercise]
  );

  useEffect(() => {
    setChunkIndex(0);
    setPreviewOpen(false);
    setPreviewSplit(a11y.splitRatio);
    setWebMode('stateless');
    setCompressedToken('');
    setServerShareId('');
    setWebError(null);
    setHtmlQrError(null);
    setCopiedText(false);
    setCopiedLink(false);
    setCopiedDataUri(false);
    setUseSharedOrigin(false);
    setCustomOrigin(originInfo.currentOrigin);
  }, [open, exercise?.id, a11y.splitRatio, originInfo.currentOrigin]);

  const activeChunk = chunks[chunkIndex] || chunks[0] || null;

  // Render QR for active offline text chunk
  useEffect(() => {
    if (!open || !activeChunk) return;
    let cancelled = false;
    setOfflineError(null);

    Promise.all([
      QRCode.toString(activeChunk.payload, {
        type: 'svg',
        margin: 2,
        width: 240,
        errorCorrectionLevel: 'M',
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
      QRCode.toDataURL(activeChunk.payload, {
        margin: 2,
        width: 720,
        errorCorrectionLevel: 'M',
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
    ])
      .then(([svg, png]) => {
        if (cancelled) return;
        setOfflineQrSvg(svg);
        setOfflineQrPngUrl(png);
      })
      .catch(() => {
        if (cancelled) return;
        setOfflineError('Could not encode this exercise chunk into a QR code.');
      });

    return () => {
      cancelled = true;
    };
  }, [open, activeChunk]);

  // Render Compact Minimal-CSS HTML QR when tab is active & fits QR capacity
  useEffect(() => {
    if (!open || tab !== 'compact-html' || !compactHtml) return;
    if (!compactHtml.fitsQr) {
      setHtmlQrSvg('');
      setHtmlQrPngUrl('');
      setHtmlQrError(null);
      return;
    }
    let cancelled = false;
    setHtmlQrError(null);

    Promise.all([
      QRCode.toString(compactHtml.dataUri, {
        type: 'svg',
        margin: 2,
        width: 240,
        errorCorrectionLevel: 'L',
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
      QRCode.toDataURL(compactHtml.dataUri, {
        margin: 2,
        width: 720,
        errorCorrectionLevel: 'L',
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
    ])
      .then(([svg, png]) => {
        if (cancelled) return;
        setHtmlQrSvg(svg);
        setHtmlQrPngUrl(png);
      })
      .catch(() => {
        if (cancelled) return;
        setHtmlQrError('Minimal HTML exceeded QR encoding capacity.');
      });

    return () => {
      cancelled = true;
    };
  }, [open, tab, compactHtml]);

  // Prepare compressed token & optional server share ID when PWA / Web Link tab is visited
  useEffect(() => {
    if (!open || !strippedExercise || tab !== 'web-link') return;
    let cancelled = false;

    const prepare = async () => {
      setWebLoading(true);
      setWebError(null);
      try {
        const token = await compressExerciseToToken(strippedExercise);
        if (cancelled) return;
        setCompressedToken(token);

        const isCurrentHost =
          (customOrigin.trim() || originInfo.currentOrigin).replace(/\/+$/, '') ===
          originInfo.currentOrigin.replace(/\/+$/, '');
        if ((token.length > 2300 && isCurrentHost) || webMode === 'server') {
          try {
            const res = await fetch('/api/shares', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ exercise: strippedExercise, a11y }),
            });
            if (res.ok) {
              const data = (await res.json()) as { id?: string };
              if (!cancelled && data.id) {
                setServerShareId(data.id);
                if (token.length > 2300 && isCurrentHost) {
                  setWebMode('server');
                }
              }
            }
          } catch {
            // Keep stateless mode if server endpoint is unreachable
          }
        }
      } catch {
        if (!cancelled) {
          setWebError('Could not prepare web share link.');
        }
      } finally {
        if (!cancelled) {
          setWebLoading(false);
        }
      }
    };

    prepare();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    strippedExercise,
    tab,
    a11y,
    refreshNonce,
    webMode,
    customOrigin,
    originInfo.currentOrigin,
  ]);

  const effectiveOrigin = (
    customOrigin.trim() ||
    (useSharedOrigin ? originInfo.sharedAppOrigin : originInfo.currentOrigin)
  ).replace(/\/+$/, '');

  const webShareUrl = useMemo(() => {
    if (!effectiveOrigin) return '';
    if (webMode === 'server' && serverShareId) {
      return `${effectiveOrigin}/?share=${encodeURIComponent(serverShareId)}`;
    }
    if (compressedToken) {
      return `${effectiveOrigin}/#offline=${encodeURIComponent(compressedToken)}`;
    }
    return '';
  }, [effectiveOrigin, webMode, serverShareId, compressedToken]);

  useEffect(() => {
    if (!open || tab !== 'web-link' || !webShareUrl) {
      setWebQrSvg('');
      setWebQrPngUrl('');
      return;
    }
    let cancelled = false;
    setWebError(null);

    Promise.all([
      QRCode.toString(webShareUrl, {
        type: 'svg',
        margin: 2,
        width: 240,
        errorCorrectionLevel: webShareUrl.length > 700 ? 'L' : 'M',
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
      QRCode.toDataURL(webShareUrl, {
        margin: 2,
        width: 720,
        errorCorrectionLevel: webShareUrl.length > 700 ? 'L' : 'M',
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
    ])
      .then(([svg, png]) => {
        if (cancelled) return;
        setWebQrSvg(svg);
        setWebQrPngUrl(png);
      })
      .catch(() => {
        if (!cancelled) {
          setWebError(
            'Link is too long for a single QR code. Switch to Offline QR (Text) or Short Link (?share).'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, tab, webShareUrl]);

  if (!open || !exercise || !strippedExercise) return null;

  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type);
  const slug =
    (exercise.title || 'exercise')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'exercise';

  const handleDownloadPng = (pngUrl: string, suffix: string) => {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${slug}-${suffix}.png`;
    a.click();
  };

  const handleCopyOfflineText = async () => {
    if (!offlineText) return;
    try {
      await navigator.clipboard.writeText(offlineText);
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleCopyWebLink = async () => {
    if (!webShareUrl) return;
    try {
      await navigator.clipboard.writeText(webShareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleCopyCompactUri = async () => {
    if (!compactHtml?.dataUri) return;
    try {
      await navigator.clipboard.writeText(compactHtml.dataUri);
      setCopiedDataUri(true);
      window.setTimeout(() => setCopiedDataUri(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadOfflineHtml = () => {
    const html = buildStudentOfflineHtml(strippedExercise, a11y);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-student-offline.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
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
          className="w-full max-w-xl max-h-[92vh] rounded-xl border shadow-2xl overflow-hidden flex flex-col"
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <QrCode
                className="w-5 h-5 shrink-0"
                style={{ color: 'var(--accent-fg)' }}
              />
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
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg cursor-pointer hover:opacity-75"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Answer-free banner */}
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
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {meta?.title} · All answer keys and explanations are excluded.
                </div>
              </div>
            </div>

            {/* 3-Mode Segmented Control */}
            <div
              className="grid grid-cols-3 gap-1 p-1 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setTab('offline-qr')}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
                style={{
                  backgroundColor:
                    tab === 'offline-qr' ? 'var(--bg-panel)' : 'transparent',
                  color:
                    tab === 'offline-qr'
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  boxShadow:
                    tab === 'offline-qr' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>Offline Text</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('web-link')}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
                style={{
                  backgroundColor:
                    tab === 'web-link' ? 'var(--bg-panel)' : 'transparent',
                  color:
                    tab === 'web-link'
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  boxShadow:
                    tab === 'web-link' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span>PWA App (#offline)</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('compact-html')}
                className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
                style={{
                  backgroundColor:
                    tab === 'compact-html' ? 'var(--bg-panel)' : 'transparent',
                  color:
                    tab === 'compact-html'
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  boxShadow:
                    tab === 'compact-html'
                      ? '0 1px 2px rgba(0,0,0,0.08)'
                      : 'none',
                }}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span>Compact HTML</span>
              </button>
            </div>

            {tab === 'offline-qr' ? (
              <div className="space-y-4">
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Encodes the exercise directly as plain text inside the QR code. Works 100% offline on every camera with zero internet, login, or browser restrictions.
                </p>

                {offlineError ? (
                  <div
                    className="p-3 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--error-bg)',
                      borderColor: 'var(--error-fg)',
                      color: 'var(--error-fg)',
                    }}
                  >
                    {offlineError}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="p-4 rounded-xl border bg-white shadow-sm inline-flex items-center justify-center"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <div
                          className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: offlineQrSvg }}
                          aria-label="Offline scannable QR code containing exercise text"
                        />
                      </div>

                      {chunks.length > 1 && activeChunk && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setChunkIndex((i) => Math.max(0, i - 1))
                            }
                            disabled={chunkIndex === 0}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border cursor-pointer disabled:opacity-40"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-subtle)',
                            }}
                            aria-label="Previous QR part"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-semibold tabular-nums px-2">
                            {activeChunk.label}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setChunkIndex((i) =>
                                Math.min(chunks.length - 1, i + 1)
                              )
                            }
                            disabled={chunkIndex >= chunks.length - 1}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border cursor-pointer disabled:opacity-40"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-subtle)',
                            }}
                            aria-label="Next QR part"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {activeChunk && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Encoded Offline Text
                            {chunks.length > 1 ? ` · ${activeChunk.label}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyOfflineText}
                            className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                            style={{ color: 'var(--accent-fg)' }}
                          >
                            {copiedText ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied all text</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy all text</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre
                          className="max-h-28 overflow-y-auto p-2.5 rounded-lg border text-[11px] font-mono whitespace-pre-wrap leading-relaxed"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {activeChunk.payload}
                        </pre>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPng(
                              offlineQrPngUrl,
                              chunks.length > 1
                                ? `offline-qr-part-${chunkIndex + 1}`
                                : 'offline-qr'
                            )
                          }
                          disabled={!offlineQrPngUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {chunks.length > 1
                              ? `Download Part ${chunkIndex + 1} PNG`
                              : 'Download QR PNG'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadOfflineHtml}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                          style={{
                            backgroundColor: 'var(--accent-soft)',
                            borderColor: 'var(--accent-border)',
                            color: 'var(--accent-fg)',
                          }}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Offline HTML</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Copy</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : tab === 'web-link' ? (
              <div className="space-y-4">
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Opens the full formatted, interactive dual-panel HTML view and caches it locally on the student&apos;s device. Once the device has opened or installed this PWA once, scanning <code className="font-mono">#offline=</code> QR codes works completely offline.
                </p>

                {originInfo.isDevPreview && (
                  <div
                    className="p-3 rounded-lg border flex items-start gap-2.5 text-xs leading-relaxed"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-strong)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <AlertTriangle
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: 'var(--accent-fg)' }}
                    />
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        Dev vs. Shared URL:
                      </strong>{' '}
                      Using your active <code className="font-mono">ais-dev-</code> URL. For student devices without an AI Studio login, publish/share the app first and switch to the <code className="font-mono">ais-pre-</code> Shared URL, or use <strong>Offline Text</strong> / <strong>Offline HTML</strong>.
                    </div>
                  </div>
                )}

                {webLoading ? (
                  <div
                    className="h-56 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Preparing share link...</span>
                  </div>
                ) : (
                  <>
                    {webError ? (
                      <div
                        className="p-3 rounded-lg border text-xs flex items-center justify-between gap-2"
                        style={{
                          backgroundColor: 'var(--error-bg)',
                          borderColor: 'var(--error-fg)',
                          color: 'var(--error-fg)',
                        }}
                      >
                        <span>{webError}</span>
                        <button
                          type="button"
                          onClick={() => setRefreshNonce((n) => n + 1)}
                          className="px-2.5 py-1 rounded border text-xs font-semibold cursor-pointer shrink-0"
                          style={{
                            backgroundColor: 'var(--bg-panel)',
                            borderColor: 'var(--error-fg)',
                            color: 'var(--error-fg)',
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      webQrSvg && (
                        <div className="flex justify-center">
                          <div
                            className="p-4 rounded-xl border bg-white shadow-sm inline-flex items-center justify-center"
                            style={{ borderColor: 'var(--border-subtle)' }}
                          >
                            <div
                              className="w-56 h-56 [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: webQrSvg }}
                              aria-label="Scannable PWA web link QR code"
                            />
                          </div>
                        </div>
                      )
                    )}

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Link Format &amp; App Host
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setWebMode('stateless')}
                            className="px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer"
                            style={{
                              backgroundColor:
                                webMode === 'stateless'
                                  ? 'var(--accent-soft)'
                                  : 'var(--bg-elevated)',
                              borderColor:
                                webMode === 'stateless'
                                  ? 'var(--accent-border)'
                                  : 'var(--border-subtle)',
                              color:
                                webMode === 'stateless'
                                  ? 'var(--accent-fg)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            Offline-Ready (#offline)
                          </button>
                          <button
                            type="button"
                            onClick={() => setWebMode('server')}
                            className="px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer"
                            style={{
                              backgroundColor:
                                webMode === 'server'
                                  ? 'var(--accent-soft)'
                                  : 'var(--bg-elevated)',
                              borderColor:
                                webMode === 'server'
                                  ? 'var(--accent-border)'
                                  : 'var(--border-subtle)',
                              color:
                                webMode === 'server'
                                  ? 'var(--accent-fg)'
                                  : 'var(--text-secondary)',
                            }}
                          >
                            Short Link (?share)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={customOrigin}
                          onChange={(e) => {
                            setUseSharedOrigin(false);
                            setCustomOrigin(e.target.value);
                          }}
                          placeholder="https://your-app-url"
                          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono rounded-lg border outline-none"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                          aria-label="App base URL"
                        />
                        {originInfo.isDevPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              const nextShared = !useSharedOrigin;
                              setUseSharedOrigin(nextShared);
                              setCustomOrigin(
                                nextShared
                                  ? originInfo.sharedAppOrigin
                                  : originInfo.currentOrigin
                              );
                              if (nextShared) {
                                setWebMode('stateless');
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {useSharedOrigin ? 'Use Dev URL' : 'Use Shared URL'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          id="share-qr-url-input"
                          type="text"
                          readOnly
                          value={webShareUrl}
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
                          onClick={handleCopyWebLink}
                          disabled={!webShareUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--accent-bg)',
                            color: 'var(--accent-text)',
                          }}
                        >
                          {copiedLink ? (
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
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPng(webQrPngUrl, 'pwa-qr')
                          }
                          disabled={!webQrPngUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download QR PNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadOfflineHtml}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                          style={{
                            backgroundColor: 'var(--accent-soft)',
                            borderColor: 'var(--accent-border)',
                            color: 'var(--accent-fg)',
                          }}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Offline HTML</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Copy</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Compact Minimal-CSS HTML QR Tab */
              <div className="space-y-4">
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Encodes a minimal-CSS formatted HTML page directly inside a <code className="font-mono">data:text/html</code> QR code without needing internet. Note: some built-in phone camera apps block <code className="font-mono">data:</code> links for security — for guaranteed compatibility, use <strong>PWA App (#offline)</strong> or <strong>Offline Text</strong>.
                </p>

                {compactHtml && (
                  <div
                    className="p-3 rounded-lg border flex items-center justify-between gap-3 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: compactHtml.fitsQr
                        ? 'var(--border-subtle)'
                        : 'var(--error-fg)',
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Minimal HTML QR Payload
                    </span>
                    <span
                      className="font-mono font-semibold tabular-nums"
                      style={{
                        color: compactHtml.fitsQr
                          ? 'var(--success-fg)'
                          : 'var(--error-fg)',
                      }}
                    >
                      {compactHtml.byteLength.toLocaleString()} /{' '}
                      {compactHtml.maxBytes.toLocaleString()} bytes
                    </span>
                  </div>
                )}

                {compactHtml && !compactHtml.fitsQr ? (
                  <div
                    className="p-4 rounded-xl border space-y-3"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-strong)',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{ color: 'var(--error-fg)' }}
                      />
                      <div className="text-xs space-y-1">
                        <div className="font-semibold">
                          Exceeds Single QR Byte Limit
                        </div>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          Even with minimal CSS, this exercise is{' '}
                          <span className="font-mono tabular-nums">
                            {compactHtml.byteLength.toLocaleString()}
                          </span>{' '}
                          bytes (limit: 2,953 bytes). Use <strong>PWA App (#offline)</strong> for full offline formatted HTML, <strong>Offline Text</strong> for camera scanning, or download the standalone <strong>Offline HTML</strong> file.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setTab('web-link')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--accent-bg)',
                          color: 'var(--accent-text)',
                        }}
                      >
                        Use PWA App (#offline)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('offline-qr')}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        Use Offline Text QR
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadOfflineHtml}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Download Offline HTML</span>
                      </button>
                    </div>
                  </div>
                ) : htmlQrError ? (
                  <div
                    className="p-3 rounded-lg border text-xs"
                    style={{
                      backgroundColor: 'var(--error-bg)',
                      borderColor: 'var(--error-fg)',
                      color: 'var(--error-fg)',
                    }}
                  >
                    {htmlQrError}
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
                          dangerouslySetInnerHTML={{ __html: htmlQrSvg }}
                          aria-label="Compact minimal-CSS HTML QR code"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadPng(htmlQrPngUrl, 'compact-html-qr')
                          }
                          disabled={!htmlQrPngUrl}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download QR PNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyCompactUri}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {copiedDataUri ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied URI</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Data URI</span>
                            </>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadOfflineHtml}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--accent-soft)',
                          borderColor: 'var(--accent-border)',
                          color: 'var(--accent-fg)',
                        }}
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>Offline HTML</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-App Student Copy Preview Modal (avoids cross-window dev proxy cookie errors) */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            color: 'var(--text-primary)',
          }}
        >
          <div
            className="flex items-center justify-between gap-4 px-5 py-3 border-b shrink-0"
            style={{
              backgroundColor: 'var(--bg-header)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--success-fg)' }}
              />
              <span className="text-sm font-semibold truncate">
                Student Copy Preview (No Answer Key):{' '}
                {strippedExercise.title || 'Untitled Exercise'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-text)',
              }}
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Preview</span>
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <PresenterWorkspace
              exercise={strippedExercise}
              studentMode={true}
              splitRatio={previewSplit}
              onSplitRatioChange={setPreviewSplit}
            />
          </div>
        </div>
      )}
    </>
  );
};
