import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  Quote,
  RemoveFormatting,
  PlusSquare,
  ListOrdered,
} from 'lucide-react';
import {
  escapeHtml,
  extractGapTokensFromHtml,
  renumberGapsInHtml,
  sanitizeExerciseHtml,
} from '../utils/htmlSanitizer';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  enableGaps?: boolean;
  gapMode?: 'standard' | 'word-formation';
  placeholder?: string;
  minHeight?: string;
  onRenumber?: (mapping: Array<{ oldNumber: number; newNumber: number; stem?: string }>) => void;
  ariaLabel?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  enableGaps = false,
  gapMode = 'standard',
  placeholder = 'Write or paste text here...',
  minHeight = '220px',
  onRenumber,
  ariaLabel = 'Rich text passage editor',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>(value);
  const savedRangeRef = useRef<Range | null>(null);

  const [stemPopoverOpen, setStemPopoverOpen] = useState(false);
  const [stemInput, setStemInput] = useState('');

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value !== lastEmittedRef.current && el.innerHTML !== value) {
      el.innerHTML = value || '';
      lastEmittedRef.current = value;
    }
  }, [value]);

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastEmittedRef.current = html;
    onChange(html);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const execFormat = (command: string, val?: string) => {
    restoreSelection();
    document.execCommand(command, false, val);
    saveSelection();
    emitChange();
  };

  const getNextGapNumber = (): number => {
    const html = editorRef.current?.innerHTML || value || '';
    const tokens = extractGapTokensFromHtml(html);
    if (tokens.length === 0) return 1;
    const maxNum = Math.max(...tokens.map((t) => t.gapNumber));
    return maxNum + 1;
  };

  const insertGapNode = (stem?: string) => {
    const el = editorRef.current;
    if (!el) return;
    restoreSelection();

    const nextNum = getNextGapNumber();
    const span = document.createElement('span');
    span.setAttribute('data-gap', String(nextNum));
    span.setAttribute('contenteditable', 'false');

    if (gapMode === 'word-formation') {
      const upperStem = (stem || 'WORD').trim().toUpperCase() || 'WORD';
      span.setAttribute('data-stem', upperStem);
      span.innerHTML = `[${nextNum}] _____ (<strong>${escapeHtml(upperStem)}</strong>)`;
    } else {
      span.textContent = `[${nextNum}]`;
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (el.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const trailingSpace = document.createTextNode('\u00A0');
        range.insertNode(trailingSpace);
        range.insertNode(span);
        // Move caret right after trailing space
        const afterRange = document.createRange();
        afterRange.setStartAfter(trailingSpace);
        afterRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(afterRange);
      } else {
        el.appendChild(span);
        el.appendChild(document.createTextNode(' '));
      }
    } else {
      el.appendChild(span);
      el.appendChild(document.createTextNode(' '));
    }

    saveSelection();
    emitChange();
  };

  const handleInsertGapClick = () => {
    saveSelection();
    if (gapMode === 'word-formation') {
      setStemInput('');
      setStemPopoverOpen(true);
    } else {
      insertGapNode();
    }
  };

  const handleConfirmStemGap = (e: React.FormEvent) => {
    e.preventDefault();
    setStemPopoverOpen(false);
    insertGapNode(stemInput || 'WORD');
    setStemInput('');
  };

  const handleRenumber = () => {
    const el = editorRef.current;
    if (!el) return;
    const { html, mapping } = renumberGapsInHtml(el.innerHTML, gapMode === 'word-formation');
    el.innerHTML = html;
    lastEmittedRef.current = html;
    onChange(html);
    if (onRenumber) {
      onRenumber(mapping);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');

    let cleaned = '';
    if (htmlData) {
      cleaned = sanitizeExerciseHtml(htmlData);
    } else if (textData) {
      const paragraphs = textData
        .split(/\r?\n\s*\r?\n/)
        .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`)
        .join('');
      cleaned = paragraphs || escapeHtml(textData);
    }

    document.execCommand('insertHTML', false, cleaned);
    emitChange();
  };

  const toolbarBtnClass =
    'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-transparent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1';

  return (
    <div
      className="rounded-lg border overflow-visible transition-colors"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* WYSIWYG Toolbar */}
      <div
        className="flex flex-wrap items-center gap-1 px-2.5 py-2 border-b relative"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('bold');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-primary)' }}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('italic');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-primary)' }}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('underline');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-primary)' }}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        <span
          className="h-4 w-px mx-1"
          style={{ backgroundColor: 'var(--border-subtle)' }}
          aria-hidden="true"
        />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('formatBlock', '<h2>');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-primary)' }}
          title="Section Heading"
          aria-label="Section Heading"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('insertUnorderedList');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-primary)' }}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('formatBlock', '<blockquote>');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-primary)' }}
          title="Quote Block"
          aria-label="Quote Block"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            execFormat('removeFormat');
          }}
          className={toolbarBtnClass}
          style={{ color: 'var(--text-muted)' }}
          title="Clear Formatting"
          aria-label="Clear Formatting"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>

        {enableGaps && (
          <>
            <span
              className="h-4 w-px mx-1"
              style={{ backgroundColor: 'var(--border-subtle)' }}
              aria-hidden="true"
            />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleInsertGapClick();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-text)',
              }}
            >
              <PlusSquare className="w-3.5 h-3.5" />
              {gapMode === 'word-formation' ? 'Insert Root Gap' : 'Insert Gap'}
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleRenumber();
              }}
              className={toolbarBtnClass}
              style={{
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
              title="Renumber all gaps sequentially (1, 2, 3...)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Renumber</span>
            </button>
          </>
        )}

        {/* Word Formation Stem Input Popover */}
        {stemPopoverOpen && (
          <form
            onSubmit={handleConfirmStemGap}
            className="absolute left-2 top-full mt-1.5 z-30 flex items-center gap-2 p-2.5 rounded-lg border shadow-lg"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <label className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
              Root word:
            </label>
            <input
              type="text"
              autoFocus
              value={stemInput}
              onChange={(e) => setStemInput(e.target.value.toUpperCase())}
              placeholder="e.g. DECIDE"
              className="px-2.5 py-1 text-xs font-mono font-bold uppercase rounded border w-32 focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs font-semibold rounded cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--accent-bg)',
                color: 'var(--accent-text)',
              }}
            >
              Insert
            </button>
            <button
              type="button"
              onClick={() => setStemPopoverOpen(false)}
              className="px-2 py-1 text-xs rounded cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* ContentEditable WYSIWYG Canvas */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        onInput={emitChange}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="wysiwyg-editor wysiwyg-prose p-4 sm:p-5 outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{
          minHeight,
          color: 'var(--text-primary)',
          fontSize: 'var(--reader-font-size)',
          lineHeight: 'var(--reader-line-height)',
          fontFamily: 'var(--reader-font-family)',
        }}
      />
    </div>
  );
};
