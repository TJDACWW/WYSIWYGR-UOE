import React, { useMemo } from 'react';

export interface GapRenderInfo {
  userAnswer?: string;
  correctAnswer?: string;
  stemWord?: string;
  isCorrect?: boolean;
  showFeedback?: boolean;
  revealed?: boolean;
  onFocusGap?: (gapNumber: number) => void;
  onInputChange?: (gapNumber: number, value: string) => void;
  inlineEditable?: boolean;
  insertedParagraphHtml?: string;
}

interface RichTextRendererProps {
  html: string;
  gapMode?: 'none' | 'choice' | 'input' | 'word-formation' | 'gapped-paragraph';
  gapsInfo?: Record<number, GapRenderInfo>;
  activeGapNumber?: number | null;
}

const VOID_TAGS = new Set(['br', 'hr', 'img']);

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  html,
  gapMode = 'none',
  gapsInfo = {},
  activeGapNumber = null,
}) => {
  const parsedBody = useMemo(() => {
    if (!html || typeof DOMParser === 'undefined') return null;
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    return doc.body.firstElementChild;
  }, [html]);

  if (!parsedBody) {
    return null;
  }

  const renderNode = (node: ChildNode, key: string): React.ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Gap token replacement
    if (el.hasAttribute('data-gap')) {
      const gapNum = parseInt(el.getAttribute('data-gap') || '1', 10);
      const attrStem = el.getAttribute('data-stem') || undefined;
      const info = gapsInfo[gapNum] || {};
      const stem = (info.stemWord || attrStem || '').toUpperCase();
      const isActive = activeGapNumber === gapNum;

      const displayValue = info.revealed ? info.correctAnswer || '' : info.userAnswer || '';

      if (gapMode === 'gapped-paragraph') {
        const hasSelection = Boolean(displayValue);
        const stateBorder = info.showFeedback
          ? info.isCorrect
            ? 'var(--success-fg)'
            : 'var(--error-fg)'
          : isActive
            ? 'var(--accent-fg)'
            : 'var(--accent-border)';
        const stateBg = info.showFeedback
          ? info.isCorrect
            ? 'var(--success-bg)'
            : 'var(--error-bg)'
          : hasSelection
            ? 'var(--accent-soft)'
            : 'var(--bg-elevated)';

        return (
          <span
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => info.onFocusGap?.(gapNum)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                info.onFocusGap?.(gapNum);
              }
            }}
            className="block my-3 px-4 py-3 rounded-lg border border-dashed transition-colors cursor-pointer"
            style={{
              borderColor: stateBorder,
              backgroundColor: stateBg,
            }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2.5 font-mono text-sm font-semibold" style={{ color: 'var(--accent-fg)' }}>
                <span>Gap {gapNum}</span>
                {hasSelection && (
                  <span style={{ color: 'var(--text-primary)' }}>
                    — Option {displayValue}
                  </span>
                )}
              </span>
              {info.showFeedback && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: info.isCorrect ? 'var(--success-fg)' : 'var(--error-fg)' }}
                >
                  {info.isCorrect ? '✓ Correct' : `✗ Key: ${info.correctAnswer}`}
                </span>
              )}
            </span>
            {info.insertedParagraphHtml && (
              <span
                className="block mt-2 text-sm opacity-95"
                style={{ color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{ __html: info.insertedParagraphHtml }}
              />
            )}
          </span>
        );
      }

      if (gapMode === 'input' || gapMode === 'word-formation') {
        const showAnswer = info.revealed;
        const borderCol = info.showFeedback
          ? info.isCorrect
            ? 'var(--success-fg)'
            : 'var(--error-fg)'
          : isActive
            ? 'var(--accent-fg)'
            : 'var(--border-strong)';

        const bgCol = info.showFeedback
          ? info.isCorrect
            ? 'var(--success-bg)'
            : 'var(--error-bg)'
          : 'var(--bg-elevated)';

        return (
          <span key={key} className="inline-flex flex-wrap items-baseline gap-1.5 mx-1 align-baseline">
            <button
              type="button"
              onClick={() => info.onFocusGap?.(gapNum)}
              className="font-mono text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
              style={{
                backgroundColor: isActive ? 'var(--accent-bg)' : 'var(--accent-soft)',
                color: isActive ? 'var(--accent-text)' : 'var(--accent-fg)',
              }}
              title={`Focus gap ${gapNum}`}
            >
              {gapNum}
            </button>
            {info.inlineEditable && !showAnswer ? (
              <input
                type="text"
                value={info.userAnswer || ''}
                onFocus={() => info.onFocusGap?.(gapNum)}
                onChange={(e) => info.onInputChange?.(gapNum, e.target.value)}
                aria-label={`Gap ${gapNum}`}
                placeholder="........"
                className="px-2 py-0.5 rounded border-b-2 font-medium text-center min-w-[7.5rem] max-w-[13rem] focus:outline-none transition-colors"
                style={{
                  borderColor: borderCol,
                  backgroundColor: bgCol,
                  color: 'var(--text-primary)',
                  fontSize: '0.95em',
                }}
              />
            ) : (
              <span
                onClick={() => info.onFocusGap?.(gapNum)}
                className="inline-block min-w-[6.5rem] px-2.5 py-0.5 rounded border-b-2 text-center font-semibold cursor-pointer"
                style={{
                  borderColor: borderCol,
                  backgroundColor: showAnswer ? 'var(--accent-soft)' : bgCol,
                  color: showAnswer ? 'var(--accent-fg)' : 'var(--text-primary)',
                }}
              >
                {displayValue || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
              </span>
            )}
            {gapMode === 'word-formation' && stem && (
              <strong
                className="font-mono font-bold uppercase tracking-wide text-[0.88em] px-1.5 py-0.5 rounded"
                style={{
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {stem}
              </strong>
            )}
          </span>
        );
      }

      // Standard choice gap (Multiple Choice Cloze)
      const borderCol = info.showFeedback
        ? info.isCorrect
          ? 'var(--success-fg)'
          : 'var(--error-fg)'
        : isActive
          ? 'var(--accent-fg)'
          : 'var(--accent-border)';
      const bgCol = info.showFeedback
        ? info.isCorrect
          ? 'var(--success-bg)'
          : 'var(--error-bg)'
        : displayValue
          ? 'var(--accent-soft)'
          : 'var(--bg-elevated)';

      return (
        <button
          key={key}
          type="button"
          onClick={() => info.onFocusGap?.(gapNum)}
          className="inline-flex items-baseline gap-1.5 mx-1 px-2.5 py-0.5 rounded-md border-b-2 font-medium cursor-pointer transition-colors align-baseline"
          style={{
            borderColor: borderCol,
            backgroundColor: bgCol,
            color: displayValue ? 'var(--accent-fg)' : 'var(--text-muted)',
          }}
        >
          <span className="font-mono text-[0.8em] font-bold tabular-nums">[{gapNum}]</span>
          <span className="font-semibold">
            {displayValue || '______'}
          </span>
        </button>
      );
    }

    const children = Array.from(el.childNodes).map((child, idx) =>
      renderNode(child, `${key}-${idx}`)
    );

    if (VOID_TAGS.has(tag)) {
      if (tag === 'br') return <br key={key} />;
      if (tag === 'hr') return <hr key={key} />;
      return null;
    }

    const safeTag = ['p', 'b', 'strong', 'i', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'span', 'div'].includes(tag)
      ? tag
      : 'span';

    return React.createElement(safeTag, { key }, children);
  };

  return (
    <div
      className="wysiwyg-prose"
      style={{
        color: 'var(--text-primary)',
        fontSize: 'var(--reader-font-size)',
        lineHeight: 'var(--reader-line-height)',
        fontFamily: 'var(--reader-font-family)',
      }}
    >
      {Array.from(parsedBody.childNodes).map((child, idx) => renderNode(child, `root-${idx}`))}
    </div>
  );
};
