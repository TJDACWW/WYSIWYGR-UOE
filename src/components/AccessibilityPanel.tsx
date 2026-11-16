import React from 'react';
import { X, Minus, Plus, RotateCcw } from 'lucide-react';
import {
  AccessibilitySettings,
  ColorThemeId,
  FontFamilyChoice,
  THEME_PALETTES,
} from '../types/exercise';

interface AccessibilityPanelProps {
  open: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onChange: (next: AccessibilitySettings) => void;
  onReset: () => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  open,
  onClose,
  settings,
  onChange,
  onReset,
}) => {
  if (!open) return null;

  const themes = Object.values(THEME_PALETTES);

  const fontChoices: Array<{ id: FontFamilyChoice; label: string; sample: string }> = [
    { id: 'sans', label: 'Sans (Plus Jakarta)', sample: 'Aa' },
    { id: 'serif', label: 'Book Serif (Source)', sample: 'Aa' },
    { id: 'readable', label: 'Open Legibility', sample: 'Aa' },
  ];

  const lineHeights = [
    { value: 1.45, label: 'Compact' },
    { value: 1.65, label: 'Balanced' },
    { value: 1.9, label: 'Wide' },
  ];

  const splitChoices = [
    { value: 42, label: '42 / 58' },
    { value: 50, label: '50 / 50' },
    { value: 58, label: '58 / 42' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden"
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
          <div>
            <h2
              id="a11y-dialog-title"
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Display & Accessibility
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Adjust text size, spacing, font style, and contrast theme for screen presentation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg cursor-pointer transition-opacity hover:opacity-75"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close accessibility settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto exercise-scroll">
          {/* Text Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="font-size-range"
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Text Size
              </label>
              <span
                className="font-mono text-sm font-semibold tabular-nums"
                style={{ color: 'var(--accent-fg)' }}
              >
                {settings.fontSize}px
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onChange({ ...settings, fontSize: Math.max(14, settings.fontSize - 1) })
                }
                className="p-2 rounded-lg border cursor-pointer"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
                aria-label="Decrease text size"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="font-size-range"
                type="range"
                min={14}
                max={28}
                step={1}
                value={settings.fontSize}
                onChange={(e) =>
                  onChange({ ...settings, fontSize: parseInt(e.target.value, 10) })
                }
                className="flex-1 accent-current cursor-pointer"
                style={{ color: 'var(--accent-fg)' }}
              />

              <button
                type="button"
                onClick={() =>
                  onChange({ ...settings, fontSize: Math.min(28, settings.fontSize + 1) })
                }
                className="p-2 rounded-lg border cursor-pointer"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                }}
                aria-label="Increase text size"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2.5">
              {[
                { label: 'Compact (15px)', size: 15 },
                { label: 'Standard (18px)', size: 18 },
                { label: 'Large (21px)', size: 21 },
                { label: 'Projector (25px)', size: 25 },
              ].map((preset) => (
                <button
                  key={preset.size}
                  type="button"
                  onClick={() => onChange({ ...settings, fontSize: preset.size })}
                  className="px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer whitespace-nowrap"
                  style={{
                    borderColor:
                      settings.fontSize === preset.size
                        ? 'var(--accent-fg)'
                        : 'var(--border-subtle)',
                    backgroundColor:
                      settings.fontSize === preset.size
                        ? 'var(--accent-soft)'
                        : 'var(--bg-elevated)',
                    color:
                      settings.fontSize === preset.size
                        ? 'var(--accent-fg)'
                        : 'var(--text-secondary)',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Theme */}
          <div>
            <div className="text-sm font-semibold mb-2.5" style={{ color: 'var(--text-primary)' }}>
              Colour & Contrast Theme
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {themes.map((t) => {
                const active = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange({ ...settings, theme: t.id as ColorThemeId })}
                    className="flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-colors"
                    style={{
                      borderColor: active ? 'var(--accent-fg)' : 'var(--border-subtle)',
                      backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                    }}
                  >
                    <span
                      className="w-10 h-10 rounded-md border shrink-0 flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: t.bgPanel,
                        borderColor: t.borderStrong,
                        color: t.textPrimary,
                      }}
                    >
                      Aa
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t.name}
                      </span>
                      <span
                        className="block text-xs truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {t.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font & Line Spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Reading Typeface
              </div>
              <div className="space-y-1.5">
                {fontChoices.map((fc) => {
                  const active = settings.fontFamily === fc.id;
                  return (
                    <button
                      key={fc.id}
                      type="button"
                      onClick={() => onChange({ ...settings, fontFamily: fc.id })}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer"
                      style={{
                        borderColor: active ? 'var(--accent-fg)' : 'var(--border-subtle)',
                        backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        color: active ? 'var(--accent-fg)' : 'var(--text-primary)',
                      }}
                    >
                      <span>{fc.label}</span>
                      <span className="font-semibold">{fc.sample}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Line Spacing
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {lineHeights.map((lh) => {
                    const active = settings.lineHeight === lh.value;
                    return (
                      <button
                        key={lh.value}
                        type="button"
                        onClick={() => onChange({ ...settings, lineHeight: lh.value })}
                        className="px-2 py-2 rounded-lg border text-xs font-medium cursor-pointer text-center"
                        style={{
                          borderColor: active ? 'var(--accent-fg)' : 'var(--border-subtle)',
                          backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          color: active ? 'var(--accent-fg)' : 'var(--text-primary)',
                        }}
                      >
                        {lh.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Panel Width Split
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {splitChoices.map((sp) => {
                    const active = settings.splitRatio === sp.value;
                    return (
                      <button
                        key={sp.value}
                        type="button"
                        onClick={() => onChange({ ...settings, splitRatio: sp.value })}
                        className="px-2 py-2 rounded-lg border text-xs font-mono font-medium cursor-pointer text-center tabular-nums"
                        style={{
                          borderColor: active ? 'var(--accent-fg)' : 'var(--border-subtle)',
                          backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          color: active ? 'var(--accent-fg)' : 'var(--text-primary)',
                        }}
                      >
                        {sp.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-6 py-3.5 border-t"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-bg)',
              color: 'var(--accent-text)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
