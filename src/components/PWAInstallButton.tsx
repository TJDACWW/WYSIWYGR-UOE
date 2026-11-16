import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
        style={{
          backgroundColor: 'var(--accent-soft)',
          borderColor: 'var(--accent-border)',
          color: 'var(--accent-fg)',
        }}
        title="Install app for offline QR exercise viewing"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: 'var(--accent-soft)',
            borderColor: 'var(--accent-border)',
            color: 'var(--accent-fg)',
          }}
          title="Install on iPhone or iPad for offline use"
        >
          <Share className="w-3.5 h-3.5 shrink-0" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="ios-pwa-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  id="ios-pwa-title"
                  className="text-base font-semibold"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Install for Offline Use
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg cursor-pointer hover:opacity-75"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label="Close instructions"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol
                className="text-sm space-y-2 leading-relaxed list-decimal pl-5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <li>
                  Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Once installed, scanning offline QR codes opens formatted
                  exercises without internet.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full min-h-[44px] rounded-xl text-sm font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-bg)',
                  color: 'var(--accent-text)',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
