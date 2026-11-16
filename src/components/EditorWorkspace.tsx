import React, { useEffect } from 'react';
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  CrossTextMatchingExercise,
  EXERCISE_TYPES,
  Exercise,
  GappedTextExercise,
  KeyWordTransformationExercise,
  MultipleChoiceClozeExercise,
  MultipleChoiceExercise,
  MultipleMatchingExercise,
  OpenClozeExercise,
  WordFormationExercise,
} from '../types/exercise';
import {
  extractGapTokensFromHtml,
  syncStemsInHtml,
} from '../utils/htmlSanitizer';
import { RichTextEditor } from './RichTextEditor';
import { DualSplitContainer } from './DualSplitContainer';

interface EditorWorkspaceProps {
  exercise: Exercise;
  onChange: (updated: Exercise) => void;
  splitRatio: number;
  onSplitRatioChange: (nextRatio: number) => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  exercise,
  onChange,
  splitRatio,
  onSplitRatioChange,
}) => {
  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type)!;

  const updateBase = (patch: Partial<Exercise>) => {
    onChange({
      ...exercise,
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Exercise);
  };

  // Sync gap items automatically when passage HTML changes for gap-based types
  const syncGapsFromPassage = (html: string, ex: Exercise): Exercise => {
    const tokens = extractGapTokensFromHtml(html);

    if (ex.type === 'multiple-choice-cloze') {
      const existingByNum = new Map(ex.items.map((it) => [it.gapNumber, it]));
      const nextItems = tokens.map((t) => {
        const found = existingByNum.get(t.gapNumber);
        if (found) return found;
        return {
          id: uid('mcc'),
          gapNumber: t.gapNumber,
          options: Array.from({ length: ex.optionCount }, () => ''),
          correctIndex: 0,
          explanation: '',
        };
      });
      return { ...ex, passageHtml: html, items: nextItems };
    }

    if (ex.type === 'open-cloze') {
      const existingByNum = new Map(ex.items.map((it) => [it.gapNumber, it]));
      const nextItems = tokens.map((t) => {
        const found = existingByNum.get(t.gapNumber);
        if (found) return found;
        return {
          id: uid('oc'),
          gapNumber: t.gapNumber,
          acceptedAnswers: [''],
          explanation: '',
        };
      });
      return { ...ex, passageHtml: html, items: nextItems };
    }

    if (ex.type === 'word-formation') {
      const existingByNum = new Map(ex.items.map((it) => [it.gapNumber, it]));
      const nextItems = tokens.map((t) => {
        const found = existingByNum.get(t.gapNumber);
        if (found) {
          return {
            ...found,
            stemWord: (t.stem || found.stemWord || 'WORD').toUpperCase(),
          };
        }
        return {
          id: uid('wf'),
          gapNumber: t.gapNumber,
          stemWord: (t.stem || 'WORD').toUpperCase(),
          acceptedAnswers: [''],
          explanation: '',
        };
      });
      return { ...ex, passageHtml: html, items: nextItems };
    }

    if (ex.type === 'gapped-text') {
      const existingByNum = new Map(ex.gaps.map((g) => [g.gapNumber, g]));
      const firstLetter = ex.options[0]?.letter || 'A';
      const nextGaps = tokens.map((t) => {
        const found = existingByNum.get(t.gapNumber);
        if (found) return found;
        return {
          id: uid('gtg'),
          gapNumber: t.gapNumber,
          correctLetter: firstLetter,
          explanation: '',
        };
      });
      return { ...ex, passageHtml: html, gaps: nextGaps };
    }

    return ex;
  };

  // Ensure initial sync if needed without infinite loop
  useEffect(() => {
    if (
      exercise.type === 'multiple-choice-cloze' ||
      exercise.type === 'open-cloze' ||
      exercise.type === 'word-formation' ||
      exercise.type === 'gapped-text'
    ) {
      const tokens = extractGapTokensFromHtml(exercise.passageHtml);
      const currentNums =
        exercise.type === 'gapped-text'
          ? exercise.gaps.map((g) => g.gapNumber)
          : exercise.items.map((i) => i.gapNumber);
      const tokenNums = tokens.map((t) => t.gapNumber);
      if (JSON.stringify(currentNums) !== JSON.stringify(tokenNums)) {
        onChange(syncGapsFromPassage(exercise.passageHtml, exercise));
      }
    }
  }, [exercise.id, exercise.type]);

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-panel)',
    borderColor: 'var(--border-subtle)',
    color: 'var(--text-primary)',
  };

  const renderMetadataHeader = () => (
    <div
      className="pb-6 mb-6 border-b space-y-3"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: 'var(--accent-fg)' }}
        >
          {meta.partLabel} · {meta.title}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          WYSIWYG Editor
        </span>
      </div>

      <div>
        <label className="sr-only" htmlFor="ex-title-input">
          Exercise Title
        </label>
        <input
          id="ex-title-input"
          type="text"
          value={exercise.title}
          onChange={(e) => updateBase({ title: e.target.value })}
          placeholder="Exercise Title"
          className="w-full text-2xl font-semibold bg-transparent border-b border-transparent focus:border-current pb-1 outline-none"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div>
        <label
          htmlFor="ex-instructions-input"
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Rubric / Student Instructions
        </label>
        <textarea
          id="ex-instructions-input"
          rows={2}
          value={exercise.instructions}
          onChange={(e) => updateBase({ instructions: e.target.value })}
          placeholder="Instructions shown to students..."
          className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-y"
          style={inputStyle}
        />
      </div>
    </div>
  );

  // LEFT PANEL RENDERERS
  const renderLeftPanel = () => {
    if (
      exercise.type === 'multiple-choice-cloze' ||
      exercise.type === 'open-cloze' ||
      exercise.type === 'word-formation' ||
      exercise.type === 'gapped-text'
    ) {
      const gapMode = exercise.type === 'word-formation' ? 'word-formation' : 'standard';
      return (
        <div>
          {renderMetadataHeader()}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.leftPanelLabel}
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Place cursor and click{' '}
              <strong>{gapMode === 'word-formation' ? 'Insert Root Gap' : 'Insert Gap'}</strong>
            </span>
          </div>
          <RichTextEditor
            key={`${exercise.id}-passage-gaps`}
            value={exercise.passageHtml}
            enableGaps={true}
            gapMode={gapMode}
            minHeight="360px"
            onChange={(html) => onChange(syncGapsFromPassage(html, exercise))}
            onRenumber={(mapping) => {
              // Preserve existing answers mapped from oldNumber -> newNumber
              if (exercise.type === 'multiple-choice-cloze') {
                const oldMap = new Map(exercise.items.map((i) => [i.gapNumber, i]));
                const nextItems = mapping.map((m) => {
                  const prev = oldMap.get(m.oldNumber);
                  return prev
                    ? { ...prev, gapNumber: m.newNumber }
                    : {
                        id: uid('mcc'),
                        gapNumber: m.newNumber,
                        options: Array.from({ length: exercise.optionCount }, () => ''),
                        correctIndex: 0,
                      };
                });
                onChange({ ...exercise, items: nextItems });
              }
            }}
          />
        </div>
      );
    }

    if (exercise.type === 'multiple-choice') {
      return (
        <div>
          {renderMetadataHeader()}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.leftPanelLabel}
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Scrolls independently from questions
            </span>
          </div>
          <RichTextEditor
            key={`${exercise.id}-passage`}
            value={exercise.passageHtml}
            enableGaps={false}
            minHeight="420px"
            onChange={(html) => updateBase({ passageHtml: html } as Partial<MultipleChoiceExercise>)}
          />
        </div>
      );
    }

    if (exercise.type === 'key-word-transformation') {
      const kwt = exercise as KeyWordTransformationExercise;

      const updateItem = (idx: number, patch: Partial<KeyWordTransformationExercise['items'][number]>) => {
        const nextItems = kwt.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange({ ...kwt, items: nextItems });
      };

      const addItem = () => {
        const nextNum = kwt.items.length + 1;
        onChange({
          ...kwt,
          items: [
            ...kwt.items,
            {
              id: uid('kwt'),
              number: nextNum,
              originalSentence: '',
              keyWord: 'WORD',
              gappedSentence: 'Complete ________ here.',
              acceptedAnswers: [''],
              explanation: '',
            },
          ],
        });
      };

      const removeItem = (idx: number) => {
        const next = kwt.items
          .filter((_, i) => i !== idx)
          .map((it, i) => ({ ...it, number: i + 1 }));
        onChange({ ...kwt, items: next });
      };

      return (
        <div>
          {renderMetadataHeader()}
          <div className="mb-6">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Optional Word-Limit Note / Example
            </label>
            <RichTextEditor
              key={`${exercise.id}-intro`}
              value={kwt.introHtml}
              minHeight="90px"
              onChange={(html) => onChange({ ...kwt, introHtml: html })}
            />
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Three-Line Transformation Prompts ({kwt.items.length})
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {kwt.items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                    Item {item.number}
                  </span>
                  {kwt.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded cursor-pointer hover:opacity-75"
                      style={{ color: 'var(--error-fg)' }}
                      aria-label={`Remove item ${item.number}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Line 1: Lead sentence */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Line 1 — Original Sentence
                  </label>
                  <input
                    type="text"
                    value={item.originalSentence}
                    onChange={(e) => updateItem(idx, { originalSentence: e.target.value })}
                    placeholder="Write the original lead sentence..."
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={inputStyle}
                  />
                </div>

                {/* Line 2: Key Word (ALL CAPS BOLD) */}
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    Line 2 — Key Word (automatically formatted ALL CAPS BOLD)
                  </label>
                  <input
                    type="text"
                    value={item.keyWord}
                    onChange={(e) => updateItem(idx, { keyWord: e.target.value.toUpperCase() })}
                    placeholder="KEYWORD"
                    className="w-48 px-3 py-2 text-sm font-mono font-bold uppercase tracking-wider rounded-lg border outline-none"
                    style={inputStyle}
                  />
                </div>

                {/* Line 3: Gapped Sentence */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      Line 3 — Gapped Second Sentence (use ________ for the blank)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(idx, {
                          gappedSentence: item.gappedSentence.includes('____')
                            ? item.gappedSentence
                            : `${item.gappedSentence.trim()} ________ `.trimStart(),
                        })
                      }
                      className="text-xs font-medium underline cursor-pointer"
                      style={{ color: 'var(--accent-fg)' }}
                    >
                      Insert ________
                    </button>
                  </div>
                  <input
                    type="text"
                    value={item.gappedSentence}
                    onChange={(e) => updateItem(idx, { gappedSentence: e.target.value })}
                    placeholder="e.g. She ________ about accepting the offer."
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Type 7 (Multiple Matching) & Type 8 (Cross-Text Matching)
    const matching = exercise as MultipleMatchingExercise | CrossTextMatchingExercise;
    const isCrossText = matching.type === 'cross-text-matching';

    const updateTextSection = (idx: number, patch: Partial<typeof matching.texts[number]>) => {
      const nextTexts = matching.texts.map((t, i) => (i === idx ? { ...t, ...patch } : t));
      onChange({ ...matching, texts: nextTexts });
    };

    const addTextSection = () => {
      if (isCrossText || matching.texts.length >= 12) return;
      const nextLetter = LETTERS[matching.texts.length] || `T${matching.texts.length + 1}`;
      onChange({
        ...matching,
        texts: [
          ...matching.texts,
          {
            id: uid('mmt'),
            letter: nextLetter,
            title: `Section ${nextLetter}`,
            html: `<p>Write or paste text ${nextLetter} here.</p>`,
          },
        ],
      });
    };

    const removeTextSection = (idx: number) => {
      if (isCrossText || matching.texts.length <= 2) return;
      const nextTexts = matching.texts
        .filter((_, i) => i !== idx)
        .map((t, i) => ({ ...t, letter: LETTERS[i] }));
      const validLetters = new Set(nextTexts.map((t) => t.letter));
      const nextItems = matching.items.map((q) =>
        validLetters.has(q.correctLetter) ? q : { ...q, correctLetter: nextTexts[0].letter }
      );
      onChange({ ...matching, texts: nextTexts, items: nextItems });
    };

    return (
      <div>
        {renderMetadataHeader()}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.leftPanelLabel} ({matching.texts.length})
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isCrossText
                ? 'Cross-text matching uses four lettered texts (A–D).'
                : 'Add as many lettered texts as needed; questions match by text letter.'}
            </p>
          </div>
          {!isCrossText && (
            <button
              type="button"
              onClick={addTextSection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Text
            </button>
          )}
        </div>

        <div className="space-y-6">
          {matching.texts.map((sec, idx) => (
            <div
              key={sec.id}
              className="pb-6 border-b last:border-b-0 space-y-2.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent-fg)',
                  }}
                >
                  {sec.letter}
                </span>
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => updateTextSection(idx, { title: e.target.value })}
                  placeholder={`Title or author for Text ${sec.letter}`}
                  className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border outline-none"
                  style={inputStyle}
                />
                {!isCrossText && matching.texts.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeTextSection(idx)}
                    className="p-2 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--border-subtle)', color: 'var(--error-fg)' }}
                    aria-label={`Remove text ${sec.letter}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <RichTextEditor
                key={`${exercise.id}-${sec.id}`}
                value={sec.html}
                minHeight="160px"
                onChange={(html) => updateTextSection(idx, { html })}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // RIGHT PANEL RENDERERS
  const renderRightPanel = () => {
    // 1. Multiple Choice Cloze
    if (exercise.type === 'multiple-choice-cloze') {
      const mcc = exercise as MultipleChoiceClozeExercise;

      const handleOptionCountChange = (count: number) => {
        const nextItems = mcc.items.map((item) => {
          const nextOpts = Array.from({ length: count }, (_, i) => item.options[i] || '');
          const nextCorrect = Math.min(item.correctIndex, count - 1);
          return { ...item, options: nextOpts, correctIndex: nextCorrect };
        });
        onChange({ ...mcc, optionCount: count, items: nextItems });
      };

      const updateItem = (idx: number, patch: Partial<typeof mcc.items[number]>) => {
        const next = mcc.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange({ ...mcc, items: next });
      };

      return (
        <div className="space-y-5">
          <div
            className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {meta.rightPanelLabel}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Set option count and mark the correct choice for each gap in the text.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="mcc-opt-count" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Options per gap:
              </label>
              <select
                id="mcc-opt-count"
                value={mcc.optionCount}
                onChange={(e) => handleOptionCountChange(parseInt(e.target.value, 10))}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg border cursor-pointer"
                style={inputStyle}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} options (A–{LETTERS[n - 1]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mcc.items.length === 0 ? (
            <div
              className="p-6 rounded-xl border text-center text-sm"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              No gaps found in the text yet. Place your cursor in the left panel and click{' '}
              <strong>Insert Gap</strong>.
            </div>
          ) : (
            <div className="space-y-4">
              {mcc.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border space-y-3"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                      Gap [{item.gapNumber}]
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      Key: {LETTERS[item.correctIndex]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.options.map((opt, optIdx) => {
                      const isCorrect = item.correctIndex === optIdx;
                      return (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateItem(idx, { correctIndex: optIdx })}
                            className="w-8 h-8 rounded-lg font-mono text-xs font-bold shrink-0 flex items-center justify-center border cursor-pointer transition-colors"
                            style={{
                              backgroundColor: isCorrect ? 'var(--accent-bg)' : 'var(--bg-panel)',
                              borderColor: isCorrect ? 'var(--accent-bg)' : 'var(--border-subtle)',
                              color: isCorrect ? 'var(--accent-text)' : 'var(--text-secondary)',
                            }}
                            title={`Mark ${LETTERS[optIdx]} as correct`}
                          >
                            {LETTERS[optIdx]}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const nextOpts = [...item.options];
                              nextOpts[optIdx] = e.target.value;
                              updateItem(idx, { options: nextOpts });
                            }}
                            placeholder={`Option ${LETTERS[optIdx]}`}
                            className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-lg border outline-none"
                            style={inputStyle}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={item.explanation || ''}
                    onChange={(e) => updateItem(idx, { explanation: e.target.value })}
                    placeholder="Optional explanation / teaching note..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 2. Open Cloze
    if (exercise.type === 'open-cloze') {
      const oc = exercise as OpenClozeExercise;
      const updateItem = (idx: number, patch: Partial<typeof oc.items[number]>) => {
        const next = oc.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange({ ...oc, items: next });
      };

      return (
        <div className="space-y-5">
          <div className="pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.rightPanelLabel}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Enter accepted answer(s) per gap. Separate multiple valid words with a slash (e.g. <code>who / that</code>).
            </p>
          </div>

          {oc.items.length === 0 ? (
            <div
              className="p-6 rounded-xl border text-center text-sm"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              Insert numbered gaps in the text on the left to create answer slots here.
            </div>
          ) : (
            <div className="space-y-3">
              {oc.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border space-y-2.5"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold tabular-nums w-14 shrink-0" style={{ color: 'var(--accent-fg)' }}>
                      Gap [{item.gapNumber}]
                    </span>
                    <input
                      type="text"
                      value={item.acceptedAnswers.join(' / ')}
                      onChange={(e) =>
                        updateItem(idx, {
                          acceptedAnswers: e.target.value
                            .split('/')
                            .map((s) => s.trim()),
                        })
                      }
                      placeholder="e.g. by  or  who / that"
                      className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg border outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <input
                    type="text"
                    value={item.explanation || ''}
                    onChange={(e) => updateItem(idx, { explanation: e.target.value })}
                    placeholder="Optional grammar/collocation note..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 3. Word Formation
    if (exercise.type === 'word-formation') {
      const wf = exercise as WordFormationExercise;
      const updateItem = (idx: number, patch: Partial<typeof wf.items[number]>) => {
        const nextItems = wf.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        let nextHtml = wf.passageHtml;
        if (patch.stemWord !== undefined) {
          const map: Record<number, string> = {};
          nextItems.forEach((it) => {
            map[it.gapNumber] = it.stemWord;
          });
          nextHtml = syncStemsInHtml(wf.passageHtml, map);
        }
        onChange({ ...wf, passageHtml: nextHtml, items: nextItems });
      };

      return (
        <div className="space-y-5">
          <div className="pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.rightPanelLabel}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Root words are displayed in <strong>ALL CAPS BOLD</strong> next to each gap in the passage.
            </p>
          </div>

          {wf.items.length === 0 ? (
            <div
              className="p-6 rounded-xl border text-center text-sm"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              Click <strong>Insert Root Gap</strong> inside the text editor on the left.
            </div>
          ) : (
            <div className="space-y-3">
              {wf.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border space-y-2.5"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <span className="sm:col-span-2 font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                      Gap [{item.gapNumber}]
                    </span>
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        Root Word (ALL CAPS BOLD)
                      </label>
                      <input
                        type="text"
                        value={item.stemWord}
                        onChange={(e) => updateItem(idx, { stemWord: e.target.value.toUpperCase() })}
                        placeholder="DECIDE"
                        className="w-full px-2.5 py-1.5 text-sm font-mono font-bold uppercase rounded-lg border outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <label className="block text-[11px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>
                        Correct Formed Word(s)
                      </label>
                      <input
                        type="text"
                        value={item.acceptedAnswers.join(' / ')}
                        onChange={(e) =>
                          updateItem(idx, {
                            acceptedAnswers: e.target.value.split('/').map((s) => s.trim()),
                          })
                        }
                        placeholder="e.g. decision"
                        className="w-full px-2.5 py-1.5 text-sm font-medium rounded-lg border outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={item.explanation || ''}
                    onChange={(e) => updateItem(idx, { explanation: e.target.value })}
                    placeholder="Optional note (e.g. noun suffix -ion)..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 4. Key Word Transformation
    if (exercise.type === 'key-word-transformation') {
      const kwt = exercise as KeyWordTransformationExercise;

      const updateItem = (idx: number, patch: Partial<typeof kwt.items[number]>) => {
        const nextItems = kwt.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange({ ...kwt, items: nextItems });
      };

      return (
        <div className="space-y-5">
          <div className="pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.rightPanelLabel}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Live 3-line preview and accepted answers for each transformation item.
            </p>
          </div>

          <div className="space-y-4">
            {kwt.items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                  Item {item.number} Preview & Answer Key
                </div>

                {/* Live 3-line preview */}
                <div
                  className="p-3 rounded-lg border space-y-1.5 text-sm"
                  style={{
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>{item.originalSentence || <span style={{ color: 'var(--text-muted)' }}>(Line 1: Original sentence)</span>}</div>
                  <div className="font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--accent-fg)' }}>
                    {item.keyWord || 'KEYWORD'}
                  </div>
                  <div>{item.gappedSentence || <span style={{ color: 'var(--text-muted)' }}>(Line 3: Gapped sentence)</span>}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Accepted Answer(s)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(idx, { acceptedAnswers: [...item.acceptedAnswers, ''] })
                      }
                      className="text-xs font-semibold cursor-pointer"
                      style={{ color: 'var(--accent-fg)' }}
                    >
                      + Add Alternative
                    </button>
                  </div>
                  {item.acceptedAnswers.map((ans, ansIdx) => (
                    <div key={ansIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ans}
                        onChange={(e) => {
                          const nextAns = [...item.acceptedAnswers];
                          nextAns[ansIdx] = e.target.value;
                          updateItem(idx, { acceptedAnswers: nextAns });
                        }}
                        placeholder="Exact phrase that fills the gap..."
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none"
                        style={inputStyle}
                      />
                      {item.acceptedAnswers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(idx, {
                              acceptedAnswers: item.acceptedAnswers.filter((_, i) => i !== ansIdx),
                            })
                          }
                          className="p-1.5 rounded cursor-pointer"
                          style={{ color: 'var(--error-fg)' }}
                          aria-label="Remove alternative answer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  value={item.explanation || ''}
                  onChange={(e) => updateItem(idx, { explanation: e.target.value })}
                  placeholder="Optional marking guide / grammar note..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 5. Multiple Choice (Long Text)
    if (exercise.type === 'multiple-choice') {
      const mc = exercise as MultipleChoiceExercise;

      const updateItem = (idx: number, patch: Partial<typeof mc.items[number]>) => {
        const next = mc.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
        onChange({ ...mc, items: next });
      };

      const addQuestion = () => {
        onChange({
          ...mc,
          items: [
            ...mc.items,
            {
              id: uid('mc'),
              number: mc.items.length + 1,
              question: '',
              options: ['', '', '', ''],
              correctIndex: 0,
              explanation: '',
            },
          ],
        });
      };

      const removeQuestion = (idx: number) => {
        const next = mc.items
          .filter((_, i) => i !== idx)
          .map((it, i) => ({ ...it, number: i + 1 }));
        onChange({ ...mc, items: next });
      };

      return (
        <div className="space-y-5">
          <div
            className="flex items-center justify-between gap-3 pb-4 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {meta.rightPanelLabel} ({mc.items.length})
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Add comprehension questions and select the correct option letter.
              </p>
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Question
            </button>
          </div>

          <div className="space-y-4">
            {mc.items.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                    Question {item.number}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.options.length}
                      onChange={(e) => {
                        const count = parseInt(e.target.value, 10);
                        const nextOpts = Array.from({ length: count }, (_, i) => item.options[i] || '');
                        updateItem(idx, {
                          options: nextOpts,
                          correctIndex: Math.min(item.correctIndex, count - 1),
                        });
                      }}
                      className="px-2 py-1 text-xs rounded border cursor-pointer"
                      style={inputStyle}
                    >
                      {[2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} options
                        </option>
                      ))}
                    </select>
                    {mc.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        className="p-1.5 rounded cursor-pointer"
                        style={{ color: 'var(--error-fg)' }}
                        aria-label={`Remove question ${item.number}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={item.question}
                  onChange={(e) => updateItem(idx, { question: e.target.value })}
                  placeholder="Write the question stem..."
                  className="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-y"
                  style={inputStyle}
                />

                <div className="space-y-2">
                  {item.options.map((opt, optIdx) => {
                    const isCorrect = item.correctIndex === optIdx;
                    return (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateItem(idx, { correctIndex: optIdx })}
                          className="w-8 h-8 rounded-lg font-mono text-xs font-bold shrink-0 flex items-center justify-center border cursor-pointer"
                          style={{
                            backgroundColor: isCorrect ? 'var(--accent-bg)' : 'var(--bg-panel)',
                            borderColor: isCorrect ? 'var(--accent-bg)' : 'var(--border-subtle)',
                            color: isCorrect ? 'var(--accent-text)' : 'var(--text-secondary)',
                          }}
                          title={`Mark ${LETTERS[optIdx]} as correct`}
                        >
                          {LETTERS[optIdx]}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const nextOpts = [...item.options];
                            nextOpts[optIdx] = e.target.value;
                            updateItem(idx, { options: nextOpts });
                          }}
                          placeholder={`Option ${LETTERS[optIdx]}`}
                          className="flex-1 px-3 py-1.5 text-sm rounded-lg border outline-none"
                          style={inputStyle}
                        />
                      </div>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={item.explanation || ''}
                  onChange={(e) => updateItem(idx, { explanation: e.target.value })}
                  placeholder="Optional text evidence / explanation..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 6. Gapped Text
    if (exercise.type === 'gapped-text') {
      const gt = exercise as GappedTextExercise;
      const optionLetters = gt.options.map((o) => o.letter);

      const addOption = () => {
        const nextLetter = LETTERS[gt.options.length] || `X${gt.options.length + 1}`;
        onChange({
          ...gt,
          options: [
            ...gt.options,
            { id: uid('gto'), letter: nextLetter, html: '<p>New removed sentence or paragraph.</p>' },
          ],
        });
      };

      const removeOption = (idx: number) => {
        if (gt.options.length <= 1) return;
        const nextOpts = gt.options
          .filter((_, i) => i !== idx)
          .map((o, i) => ({ ...o, letter: LETTERS[i] }));
        const validSet = new Set(nextOpts.map((o) => o.letter));
        const nextGaps = gt.gaps.map((g) =>
          validSet.has(g.correctLetter) ? g : { ...g, correctLetter: nextOpts[0].letter }
        );
        onChange({ ...gt, options: nextOpts, gaps: nextGaps });
      };

      const updateOptionHtml = (idx: number, html: string) => {
        const nextOpts = gt.options.map((o, i) => (i === idx ? { ...o, html } : o));
        onChange({ ...gt, options: nextOpts });
      };

      const updateGap = (idx: number, patch: Partial<typeof gt.gaps[number]>) => {
        const nextGaps = gt.gaps.map((g, i) => (i === idx ? { ...g, ...patch } : g));
        onChange({ ...gt, gaps: nextGaps });
      };

      return (
        <div className="space-y-6">
          {/* Section A: Gap Answer Key */}
          <div className="space-y-3 pb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Gap Answer Key ({gt.gaps.length} gaps)
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Assign the matching option letter to each gap in the passage.
                </p>
              </div>
              {gt.options.length > gt.gaps.length && (
                <span className="text-xs font-medium" style={{ color: 'var(--accent-fg)' }}>
                  {gt.options.length - gt.gaps.length} extra distractor(s)
                </span>
              )}
            </div>

            {gt.gaps.length === 0 ? (
              <div
                className="p-4 rounded-xl border text-xs"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                Insert gaps inside the passage on the left to map them to options below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {gt.gaps.map((gap, idx) => (
                  <div
                    key={gap.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                      Gap [{gap.gapNumber}]
                    </span>
                    <select
                      value={gap.correctLetter}
                      onChange={(e) => updateGap(idx, { correctLetter: e.target.value })}
                      className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border cursor-pointer"
                      style={inputStyle}
                    >
                      {optionLetters.map((ltr) => (
                        <option key={ltr} value={ltr}>
                          Option {ltr}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Removed Sentences/Paragraphs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Extracted Options ({gt.options.length})
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Add extra options beyond the gap count to include distractors.
                </p>
              </div>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Option
              </button>
            </div>

            <div className="space-y-4">
              {gt.options.map((opt, idx) => (
                <div key={opt.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2 font-mono text-xs font-bold"
                      style={{ color: 'var(--accent-fg)' }}
                    >
                      Option {opt.letter}
                    </span>
                    {gt.options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-1.5 rounded cursor-pointer"
                        style={{ color: 'var(--error-fg)' }}
                        aria-label={`Remove option ${opt.letter}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <RichTextEditor
                    key={`${exercise.id}-${opt.id}`}
                    value={opt.html}
                    minHeight="90px"
                    onChange={(html) => updateOptionHtml(idx, html)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 7 & 8. Multiple Matching & Cross-Text Multiple Matching
    const matching = exercise as MultipleMatchingExercise | CrossTextMatchingExercise;
    const textLetters = matching.texts.map((t) => t.letter);

    const updateQuestion = (idx: number, patch: Partial<typeof matching.items[number]>) => {
      const next = matching.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      onChange({ ...matching, items: next });
    };

    const addQuestion = () => {
      onChange({
        ...matching,
        items: [
          ...matching.items,
          {
            id: uid('mq'),
            number: matching.items.length + 1,
            question: '',
            correctLetter: textLetters[0] || 'A',
            explanation: '',
          },
        ],
      });
    };

    const removeQuestion = (idx: number) => {
      if (matching.items.length <= 1) return;
      const next = matching.items
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, number: i + 1 }));
      onChange({ ...matching, items: next });
    };

    return (
      <div className="space-y-5">
        <div
          className="flex items-center justify-between gap-3 pb-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {meta.rightPanelLabel} ({matching.items.length})
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Choose the letter of the matching text ({textLetters.join(', ')}) for each question.
            </p>
          </div>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>

        <div className="space-y-3.5">
          {matching.items.map((item, idx) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border space-y-2.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                  Q{item.number}
                </span>
                <div className="flex items-center gap-1.5">
                  {textLetters.map((ltr) => {
                    const active = item.correctLetter === ltr;
                    return (
                      <button
                        key={ltr}
                        type="button"
                        onClick={() => updateQuestion(idx, { correctLetter: ltr })}
                        className="w-8 h-8 rounded-lg font-mono text-xs font-bold border cursor-pointer transition-colors"
                        style={{
                          backgroundColor: active ? 'var(--accent-bg)' : 'var(--bg-panel)',
                          borderColor: active ? 'var(--accent-bg)' : 'var(--border-subtle)',
                          color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
                        }}
                        title={`Set answer to Text ${ltr}`}
                      >
                        {ltr}
                      </button>
                    );
                  })}
                  {matching.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      className="p-1.5 rounded ml-1 cursor-pointer"
                      style={{ color: 'var(--error-fg)' }}
                      aria-label={`Remove question ${item.number}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={item.question}
                onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                placeholder={`Question ${item.number} prompt...`}
                className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                style={inputStyle}
              />

              <input
                type="text"
                value={item.explanation || ''}
                onChange={(e) => updateQuestion(idx, { explanation: e.target.value })}
                placeholder="Optional evidence / answer note..."
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <DualSplitContainer
      leftAriaLabel={meta.leftPanelLabel}
      rightAriaLabel={meta.rightPanelLabel}
      splitRatio={splitRatio}
      onSplitRatioChange={onSplitRatioChange}
      leftPanel={<div className="max-w-3xl mx-auto">{renderLeftPanel()}</div>}
      rightPanel={<div className="max-w-3xl mx-auto">{renderRightPanel()}</div>}
    />
  );
};
