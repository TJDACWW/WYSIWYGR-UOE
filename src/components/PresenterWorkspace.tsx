import React, { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CheckCheck,
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
import { GapRenderInfo, RichTextRenderer } from './RichTextRenderer';
import { DualSplitContainer } from './DualSplitContainer';

interface PresenterWorkspaceProps {
  exercise: Exercise;
  splitRatio: number;
  onSplitRatioChange: (nextRatio: number) => void;
  studentMode?: boolean;
  storageKey?: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function normalizeAnswer(val: string): string {
  return val.trim().replace(/\s+/g, ' ').toLowerCase();
}

export const PresenterWorkspace: React.FC<PresenterWorkspaceProps> = ({
  exercise,
  splitRatio,
  onSplitRatioChange,
  studentMode = false,
  storageKey,
}) => {
  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type)!;

  // Answers state keyed by item number / gapNumber
  const [choiceAnswers, setChoiceAnswers] = useState<Record<number, number>>(() => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw).choiceAnswers || {} : {};
    } catch {
      return {};
    }
  });
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>(() => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw).textAnswers || {} : {};
    } catch {
      return {};
    }
  });
  const [letterAnswers, setLetterAnswers] = useState<Record<number, string>>(() => {
    if (!storageKey) return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw).letterAnswers || {} : {};
    } catch {
      return {};
    }
  });
  const [revealedItems, setRevealedItems] = useState<Record<number, boolean>>({});
  const [revealAll, setRevealAll] = useState(false);
  const [checked, setChecked] = useState(false);
  const [activeItemNum, setActiveItemNum] = useState<number | null>(null);

  // Reset responses when switching exercises (unless bound to a shared student storageKey)
  useEffect(() => {
    if (storageKey) return;
    setChoiceAnswers({});
    setTextAnswers({});
    setLetterAnswers({});
    setRevealedItems({});
    setRevealAll(false);
    setChecked(false);
    setActiveItemNum(null);
  }, [exercise.id, storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ choiceAnswers, textAnswers, letterAnswers })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [storageKey, choiceAnswers, textAnswers, letterAnswers]);

  const handleToggleRevealAll = () => {
    const next = !revealAll;
    setRevealAll(next);
    if (!next) {
      setRevealedItems({});
    }
  };

  const toggleItemReveal = (num: number) => {
    setRevealedItems((prev) => ({ ...prev, [num]: !prev[num] }));
  };

  const handleReset = () => {
    setChoiceAnswers({});
    setTextAnswers({});
    setLetterAnswers({});
    setRevealedItems({});
    setRevealAll(false);
    setChecked(false);
  };

  const focusItem = (num: number) => {
    setActiveItemNum(num);
    const el = document.getElementById(`presenter-item-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Compute score when checked
  const computeScore = (): { correct: number; total: number } => {
    if (exercise.type === 'multiple-choice-cloze' || exercise.type === 'multiple-choice') {
      const total = exercise.items.length;
      const correct = exercise.items.filter((it) => {
        const num = 'gapNumber' in it ? it.gapNumber : it.number;
        return choiceAnswers[num] === it.correctIndex;
      }).length;
      return { correct, total };
    }
    if (
      exercise.type === 'open-cloze' ||
      exercise.type === 'word-formation' ||
      exercise.type === 'key-word-transformation'
    ) {
      const total = exercise.items.length;
      const correct = exercise.items.filter((it) => {
        const num = 'gapNumber' in it ? it.gapNumber : it.number;
        const userVal = normalizeAnswer(textAnswers[num] || '');
        if (!userVal) return false;
        return it.acceptedAnswers.some((ans) => normalizeAnswer(ans) === userVal);
      }).length;
      return { correct, total };
    }
    if (exercise.type === 'gapped-text') {
      const total = exercise.gaps.length;
      const correct = exercise.gaps.filter(
        (g) => letterAnswers[g.gapNumber] === g.correctLetter
      ).length;
      return { correct, total };
    }
    // multiple-matching / cross-text-matching
    const total = exercise.items.length;
    const correct = exercise.items.filter(
      (it) => letterAnswers[it.number] === it.correctLetter
    ).length;
    return { correct, total };
  };

  const effectiveChecked = !studentMode && checked;
  const effectiveRevealAll = !studentMode && revealAll;
  const score = effectiveChecked ? computeScore() : null;

  const readerTextStyle: React.CSSProperties = {
    fontSize: 'var(--reader-font-size)',
    lineHeight: 'var(--reader-line-height)',
    fontFamily: 'var(--reader-font-family)',
    color: 'var(--text-primary)',
  };

  // Build GapsInfo map for RichTextRenderer when Left Panel contains passage gaps
  const buildGapsInfo = (): Record<number, GapRenderInfo> => {
    const info: Record<number, GapRenderInfo> = {};

    if (exercise.type === 'multiple-choice-cloze') {
      exercise.items.forEach((item) => {
        const isRev = revealAll || Boolean(revealedItems[item.gapNumber]);
        const chosenIdx = choiceAnswers[item.gapNumber];
        const userWord = chosenIdx !== undefined ? item.options[chosenIdx] || LETTERS[chosenIdx] : '';
        const correctWord = item.options[item.correctIndex] || LETTERS[item.correctIndex];
        info[item.gapNumber] = {
          userAnswer: userWord,
          correctAnswer: correctWord,
          revealed: isRev,
          showFeedback: checked,
          isCorrect: chosenIdx === item.correctIndex,
          onFocusGap: focusItem,
        };
      });
    } else if (exercise.type === 'open-cloze' || exercise.type === 'word-formation') {
      exercise.items.forEach((item) => {
        const isRev = revealAll || Boolean(revealedItems[item.gapNumber]);
        const userVal = textAnswers[item.gapNumber] || '';
        const norm = normalizeAnswer(userVal);
        const isOk = Boolean(norm) && item.acceptedAnswers.some((a) => normalizeAnswer(a) === norm);
        info[item.gapNumber] = {
          userAnswer: userVal,
          correctAnswer: item.acceptedAnswers.filter(Boolean).join(' / '),
          stemWord:
            exercise.type === 'word-formation'
              ? (item as WordFormationExercise['items'][number]).stemWord
              : undefined,
          revealed: isRev,
          showFeedback: checked,
          isCorrect: isOk,
          inlineEditable: true,
          onFocusGap: focusItem,
          onInputChange: (gapNum, val) =>
            setTextAnswers((prev) => ({ ...prev, [gapNum]: val })),
        };
      });
    } else if (exercise.type === 'gapped-text') {
      exercise.gaps.forEach((gap) => {
        const isRev = revealAll || Boolean(revealedItems[gap.gapNumber]);
        const selectedLetter = letterAnswers[gap.gapNumber] || '';
        const displayLetter = isRev ? gap.correctLetter : selectedLetter;
        const opt = exercise.options.find((o) => o.letter === displayLetter);
        info[gap.gapNumber] = {
          userAnswer: selectedLetter,
          correctAnswer: gap.correctLetter,
          revealed: isRev,
          showFeedback: checked,
          isCorrect: selectedLetter === gap.correctLetter,
          insertedParagraphHtml: opt ? opt.html : undefined,
          onFocusGap: focusItem,
        };
      });
    }

    return info;
  };

  const renderLeftPanel = () => {
    const header = (
      <header className="pb-6 mb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
          <span className="font-mono font-semibold" style={{ color: 'var(--accent-fg)' }}>
            {meta.partLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span>{meta.title}</span>
        </div>
        <h1
          className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            textWrap: 'balance',
          }}
        >
          {exercise.title}
        </h1>
        {exercise.instructions && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {exercise.instructions}
          </p>
        )}
      </header>
    );

    if (exercise.type === 'multiple-choice-cloze') {
      return (
        <div>
          {header}
          <RichTextRenderer
            html={exercise.passageHtml}
            gapMode="choice"
            gapsInfo={buildGapsInfo()}
            activeGapNumber={activeItemNum}
          />
        </div>
      );
    }

    if (exercise.type === 'open-cloze') {
      return (
        <div>
          {header}
          <RichTextRenderer
            html={exercise.passageHtml}
            gapMode="input"
            gapsInfo={buildGapsInfo()}
            activeGapNumber={activeItemNum}
          />
        </div>
      );
    }

    if (exercise.type === 'word-formation') {
      return (
        <div>
          {header}
          <RichTextRenderer
            html={exercise.passageHtml}
            gapMode="word-formation"
            gapsInfo={buildGapsInfo()}
            activeGapNumber={activeItemNum}
          />
        </div>
      );
    }

    if (exercise.type === 'gapped-text') {
      return (
        <div>
          {header}
          <RichTextRenderer
            html={exercise.passageHtml}
            gapMode="gapped-paragraph"
            gapsInfo={buildGapsInfo()}
            activeGapNumber={activeItemNum}
          />
        </div>
      );
    }

    if (exercise.type === 'multiple-choice') {
      return (
        <div>
          {header}
          <RichTextRenderer html={exercise.passageHtml} gapMode="none" />
        </div>
      );
    }

    if (exercise.type === 'key-word-transformation') {
      const kwt = exercise as KeyWordTransformationExercise;
      return (
        <div>
          {header}
          {kwt.introHtml && (
            <div className="mb-6">
              <RichTextRenderer html={kwt.introHtml} gapMode="none" />
            </div>
          )}

          <div className="space-y-6">
            {kwt.items.map((item) => {
              const isRev = revealAll || Boolean(revealedItems[item.number]);
              const userVal = textAnswers[item.number] || '';
              const isOk =
                Boolean(normalizeAnswer(userVal)) &&
                item.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(userVal));
              const parts = item.gappedSentence.split(/_{3,}|\[gap\]/i);
              const before = parts[0] ?? item.gappedSentence;
              const after = parts.length > 1 ? parts.slice(1).join(' ') : '';

              return (
                <div
                  key={item.id}
                  onClick={() => focusItem(item.number)}
                  className="p-5 rounded-xl border transition-colors cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor:
                      activeItemNum === item.number ? 'var(--accent-fg)' : 'var(--border-subtle)',
                    ...readerTextStyle,
                  }}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-mono text-sm font-bold tabular-nums shrink-0"
                      style={{ color: 'var(--accent-fg)' }}
                    >
                      {item.number}.
                    </span>
                    <div className="space-y-2.5 flex-1 min-w-0">
                      {/* Line 1: Lead sentence */}
                      <div style={{ color: 'var(--text-primary)' }}>{item.originalSentence}</div>

                      {/* Line 2: ALL CAPS BOLD key word */}
                      <div>
                        <strong
                          className="font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block"
                          style={{
                            backgroundColor: 'var(--accent-soft)',
                            color: 'var(--accent-fg)',
                            fontSize: '0.92em',
                          }}
                        >
                          {item.keyWord}
                        </strong>
                      </div>

                      {/* Line 3: Gapped second sentence */}
                      <div style={{ color: 'var(--text-primary)' }}>
                        <span>{before}</span>
                        <span
                          className="inline-block min-w-[9rem] px-2.5 py-0.5 mx-1 rounded border-b-2 text-center font-semibold"
                          style={{
                            borderColor: checked
                              ? isOk
                                ? 'var(--success-fg)'
                                : 'var(--error-fg)'
                              : 'var(--accent-border)',
                            backgroundColor: isRev
                              ? 'var(--accent-soft)'
                              : 'var(--bg-panel)',
                            color: isRev ? 'var(--accent-fg)' : 'var(--text-primary)',
                          }}
                        >
                          {isRev
                            ? item.acceptedAnswers[0]
                            : userVal || '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
                        </span>
                        <span>{after}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Type 7 & Type 8: Multiple Matching / Cross-Text Matching
    const matching = exercise as MultipleMatchingExercise | CrossTextMatchingExercise;
    return (
      <div>
        {header}
        <div className="space-y-8">
          {matching.texts.map((sec) => (
            <article
              key={sec.id}
              className="pb-8 border-b last:border-b-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-mono text-base font-bold shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-bg)',
                    color: 'var(--accent-text)',
                  }}
                >
                  {sec.letter}
                </span>
                <h2
                  className="text-lg font-semibold"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {sec.title}
                </h2>
              </div>
              <RichTextRenderer html={sec.html} gapMode="none" />
            </article>
          ))}
        </div>
      </div>
    );
  };

  const renderRightPanel = () => {
    // 1. Multiple Choice Cloze
    if (exercise.type === 'multiple-choice-cloze') {
      const mcc = exercise as MultipleChoiceClozeExercise;
      return (
        <div className="space-y-4">
          {mcc.items.map((item) => {
            const selected = choiceAnswers[item.gapNumber];
            const isRev = revealAll || Boolean(revealedItems[item.gapNumber]);
            const isOk = selected === item.correctIndex;
            const isActive = activeItemNum === item.gapNumber;

            return (
              <div
                key={item.id}
                id={`presenter-item-${item.gapNumber}`}
                className="p-4 rounded-xl border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: isActive ? 'var(--accent-fg)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className="font-mono text-sm font-bold tabular-nums"
                    style={{ color: 'var(--accent-fg)' }}
                  >
                    Gap {item.gapNumber}
                  </span>
                  <div className="flex items-center gap-3">
                    {!studentMode && checked && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: isOk ? 'var(--success-fg)' : 'var(--error-fg)' }}
                      >
                        {isOk ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            Key: {LETTERS[item.correctIndex]}
                          </>
                        )}
                      </span>
                    )}
                    {!studentMode && (
                      <button
                        type="button"
                        onClick={() => toggleItemReveal(item.gapNumber)}
                        className="text-xs font-medium cursor-pointer hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {isRev ? 'Hide Key' : 'Show Key'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.options.map((opt, optIdx) => {
                    const isSelected = selected === optIdx;
                    const isCorrectOpt = item.correctIndex === optIdx;
                    const highlightCorrect = (isRev || checked) && isCorrectOpt;
                    const highlightWrong = checked && isSelected && !isCorrectOpt;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          setActiveItemNum(item.gapNumber);
                          setChoiceAnswers((prev) => ({ ...prev, [item.gapNumber]: optIdx }));
                        }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-colors"
                        style={{
                          backgroundColor: highlightCorrect
                            ? 'var(--success-bg)'
                            : highlightWrong
                              ? 'var(--error-bg)'
                              : isSelected
                                ? 'var(--accent-soft)'
                                : 'var(--bg-elevated)',
                          borderColor: highlightCorrect
                            ? 'var(--success-fg)'
                            : highlightWrong
                              ? 'var(--error-fg)'
                              : isSelected
                                ? 'var(--accent-fg)'
                                : 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: 'calc(var(--reader-font-size) * 0.92)',
                        }}
                      >
                        <span
                          className="font-mono text-xs font-bold w-6 h-6 rounded flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isSelected || highlightCorrect ? 'var(--accent-bg)' : 'var(--bg-panel)',
                            color: isSelected || highlightCorrect ? 'var(--accent-text)' : 'var(--text-secondary)',
                          }}
                        >
                          {LETTERS[optIdx]}
                        </span>
                        <span className="font-medium truncate">{opt || `Option ${LETTERS[optIdx]}`}</span>
                      </button>
                    );
                  })}
                </div>

                {isRev && item.explanation && (
                  <p className="mt-2.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Note:</strong> {item.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 2. Open Cloze & 3. Word Formation
    if (exercise.type === 'open-cloze' || exercise.type === 'word-formation') {
      const isWF = exercise.type === 'word-formation';
      return (
        <div className="space-y-3.5">
          {exercise.items.map((item) => {
            const userVal = textAnswers[item.gapNumber] || '';
            const isRev = revealAll || Boolean(revealedItems[item.gapNumber]);
            const isOk =
              Boolean(normalizeAnswer(userVal)) &&
              item.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(userVal));
            const isActive = activeItemNum === item.gapNumber;

            return (
              <div
                key={item.id}
                id={`presenter-item-${item.gapNumber}`}
                className="p-4 rounded-xl border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: isActive ? 'var(--accent-fg)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="font-mono text-sm font-bold tabular-nums"
                      style={{ color: 'var(--accent-fg)' }}
                    >
                      Gap {item.gapNumber}
                    </span>
                    {isWF && (
                      <strong
                        className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {(item as WordFormationExercise['items'][number]).stemWord}
                      </strong>
                    )}
                  </div>

                  {!studentMode && (
                    <div className="flex items-center gap-3">
                      {checked && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: isOk ? 'var(--success-fg)' : 'var(--error-fg)' }}
                        >
                          {isOk ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Incorrect
                            </>
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleItemReveal(item.gapNumber)}
                        className="text-xs font-medium cursor-pointer hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {isRev ? 'Hide Key' : 'Show Key'}
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={userVal}
                  onFocus={() => setActiveItemNum(item.gapNumber)}
                  onChange={(e) =>
                    setTextAnswers((prev) => ({ ...prev, [item.gapNumber]: e.target.value }))
                  }
                  placeholder={isWF ? 'Type formed word...' : 'Type missing word...'}
                  className="w-full px-3 py-2 rounded-lg border outline-none font-medium"
                  style={{
                    backgroundColor: checked
                      ? isOk
                        ? 'var(--success-bg)'
                        : 'var(--error-bg)'
                      : 'var(--bg-elevated)',
                    borderColor: checked
                      ? isOk
                        ? 'var(--success-fg)'
                        : 'var(--error-fg)'
                      : 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: 'calc(var(--reader-font-size) * 0.94)',
                  }}
                />

                {(isRev || (checked && !isOk)) && (
                  <div className="mt-2.5 text-sm" style={{ color: 'var(--accent-fg)' }}>
                    <strong>Answer Key:</strong> {item.acceptedAnswers.filter(Boolean).join(' / ')}
                    {item.explanation && (
                      <span className="block text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {item.explanation}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 4. Key Word Transformation
    if (exercise.type === 'key-word-transformation') {
      const kwt = exercise as KeyWordTransformationExercise;
      return (
        <div className="space-y-4">
          {kwt.items.map((item) => {
            const userVal = textAnswers[item.number] || '';
            const isRev = revealAll || Boolean(revealedItems[item.number]);
            const isOk =
              Boolean(normalizeAnswer(userVal)) &&
              item.acceptedAnswers.some((a) => normalizeAnswer(a) === normalizeAnswer(userVal));
            const isActive = activeItemNum === item.number;

            return (
              <div
                key={item.id}
                id={`presenter-item-${item.number}`}
                className="p-4 rounded-xl border transition-colors"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: isActive ? 'var(--accent-fg)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                      Item {item.number}
                    </span>
                    <strong
                      className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent-fg)',
                      }}
                    >
                      {item.keyWord}
                    </strong>
                  </div>

                  {!studentMode && (
                    <div className="flex items-center gap-3">
                      {checked && (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: isOk ? 'var(--success-fg)' : 'var(--error-fg)' }}
                        >
                          {isOk ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Correct
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Check Key
                            </>
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleItemReveal(item.number)}
                        className="text-xs font-medium cursor-pointer hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {isRev ? 'Hide Key' : 'Show Key'}
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={userVal}
                  onFocus={() => setActiveItemNum(item.number)}
                  onChange={(e) =>
                    setTextAnswers((prev) => ({ ...prev, [item.number]: e.target.value }))
                  }
                  placeholder="Type your transformation phrase..."
                  className="w-full px-3 py-2 rounded-lg border outline-none font-medium"
                  style={{
                    backgroundColor: checked
                      ? isOk
                        ? 'var(--success-bg)'
                        : 'var(--error-bg)'
                      : 'var(--bg-elevated)',
                    borderColor: checked
                      ? isOk
                        ? 'var(--success-fg)'
                        : 'var(--error-fg)'
                      : 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: 'calc(var(--reader-font-size) * 0.94)',
                  }}
                />

                {(isRev || (checked && !isOk)) && (
                  <div className="mt-2.5 text-sm space-y-1" style={{ color: 'var(--accent-fg)' }}>
                    <div>
                      <strong>Accepted:</strong> {item.acceptedAnswers.filter(Boolean).join('  |  ')}
                    </div>
                    {item.explanation && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {item.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 5. Multiple Choice (Long Text)
    if (exercise.type === 'multiple-choice') {
      const mc = exercise as MultipleChoiceExercise;
      return (
        <div className="space-y-5">
          {mc.items.map((item) => {
            const selected = choiceAnswers[item.number];
            const isRev = revealAll || Boolean(revealedItems[item.number]);
            const isOk = selected === item.correctIndex;

            return (
              <div
                key={item.id}
                id={`presenter-item-${item.number}`}
                className="p-5 rounded-xl border space-y-3.5"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="font-semibold leading-snug"
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 'calc(var(--reader-font-size) * 0.96)',
                    }}
                  >
                    <span className="font-mono mr-2 tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                      {item.number}.
                    </span>
                    {item.question}
                  </div>
                  {!studentMode && (
                    <button
                      type="button"
                      onClick={() => toggleItemReveal(item.number)}
                      className="text-xs font-medium cursor-pointer hover:underline shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {isRev ? 'Hide Key' : 'Show Key'}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {item.options.map((opt, optIdx) => {
                    const isSelected = selected === optIdx;
                    const isCorrectOpt = item.correctIndex === optIdx;
                    const highlightCorrect = (isRev || checked) && isCorrectOpt;
                    const highlightWrong = checked && isSelected && !isCorrectOpt;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() =>
                          setChoiceAnswers((prev) => ({ ...prev, [item.number]: optIdx }))
                        }
                        className="w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg border text-left cursor-pointer transition-colors"
                        style={{
                          backgroundColor: highlightCorrect
                            ? 'var(--success-bg)'
                            : highlightWrong
                              ? 'var(--error-bg)'
                              : isSelected
                                ? 'var(--accent-soft)'
                                : 'var(--bg-elevated)',
                          borderColor: highlightCorrect
                            ? 'var(--success-fg)'
                            : highlightWrong
                              ? 'var(--error-fg)'
                              : isSelected
                                ? 'var(--accent-fg)'
                                : 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                          fontSize: 'calc(var(--reader-font-size) * 0.92)',
                          lineHeight: 'var(--reader-line-height)',
                        }}
                      >
                        <span
                          className="font-mono text-xs font-bold w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isSelected || highlightCorrect ? 'var(--accent-bg)' : 'var(--bg-panel)',
                            color: isSelected || highlightCorrect ? 'var(--accent-text)' : 'var(--text-secondary)',
                          }}
                        >
                          {LETTERS[optIdx]}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {checked && (
                  <div
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: isOk ? 'var(--success-fg)' : 'var(--error-fg)' }}
                  >
                    {isOk ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Correct ({LETTERS[item.correctIndex]})
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Correct answer is {LETTERS[item.correctIndex]}
                      </>
                    )}
                  </div>
                )}

                {isRev && item.explanation && (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Evidence:</strong> {item.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // 6. Gapped Text
    if (exercise.type === 'gapped-text') {
      const gt = exercise as GappedTextExercise;
      const usedByGap = new Map<string, number>();
      Object.entries(letterAnswers).forEach(([gNum, ltr]) => {
        if (ltr) usedByGap.set(ltr, Number(gNum));
      });

      return (
        <div className="space-y-6">
          {/* Gap Selector Grid */}
          <div className="space-y-2.5 pb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Assign Options to Gaps (1–{gt.gaps.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {gt.gaps.map((gap) => {
                const selected = letterAnswers[gap.gapNumber] || '';
                const isRev = revealAll || Boolean(revealedItems[gap.gapNumber]);
                const isOk = selected === gap.correctLetter;

                return (
                  <div
                    key={gap.id}
                    id={`presenter-item-${gap.gapNumber}`}
                    className="p-3 rounded-xl border flex items-center justify-between gap-2"
                    style={{
                      backgroundColor: checked
                        ? isOk
                          ? 'var(--success-bg)'
                          : 'var(--error-bg)'
                        : activeItemNum === gap.gapNumber
                          ? 'var(--accent-soft)'
                          : 'var(--bg-panel)',
                      borderColor: checked
                        ? isOk
                          ? 'var(--success-fg)'
                          : 'var(--error-fg)'
                        : activeItemNum === gap.gapNumber
                          ? 'var(--accent-fg)'
                          : 'var(--border-subtle)',
                    }}
                  >
                    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                      Gap {gap.gapNumber}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={selected}
                        onFocus={() => setActiveItemNum(gap.gapNumber)}
                        onChange={(e) =>
                          setLetterAnswers((prev) => ({
                            ...prev,
                            [gap.gapNumber]: e.target.value,
                          }))
                        }
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="">— Select —</option>
                        {gt.options.map((opt) => (
                          <option key={opt.id} value={opt.letter}>
                            Option {opt.letter}
                          </option>
                        ))}
                      </select>
                      {(isRev || (checked && !isOk)) && (
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--success-fg)' }}>
                          Key: {gap.correctLetter}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Removed Sentences/Paragraphs List */}
          <div className="space-y-3.5">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Removed Sentences & Distractors ({gt.options.length} options for {gt.gaps.length} gaps)
            </h3>
            {gt.options.map((opt) => {
              const assignedGap = usedByGap.get(opt.letter);
              const isCorrectlyUsed =
                revealAll && gt.gaps.some((g) => g.correctLetter === opt.letter);
              const matchingGap = gt.gaps.find((g) => g.correctLetter === opt.letter);

              return (
                <div
                  key={opt.id}
                  className="p-4 rounded-xl border space-y-2"
                  style={{
                    backgroundColor: isCorrectlyUsed ? 'var(--accent-soft)' : 'var(--bg-panel)',
                    borderColor: isCorrectlyUsed ? 'var(--accent-fg)' : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md font-mono text-sm font-bold"
                      style={{
                        backgroundColor: 'var(--accent-bg)',
                        color: 'var(--accent-text)',
                      }}
                    >
                      {opt.letter}
                    </span>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      {assignedGap && (
                        <span style={{ color: 'var(--accent-fg)' }}>
                          Selected for Gap {assignedGap}
                        </span>
                      )}
                      {revealAll && (
                        <span style={{ color: matchingGap ? 'var(--success-fg)' : 'var(--text-muted)' }}>
                          {matchingGap ? `Fits Gap ${matchingGap.gapNumber}` : 'Extra distractor'}
                        </span>
                      )}
                    </div>
                  </div>
                  <RichTextRenderer html={opt.html} gapMode="none" />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 7 & 8. Multiple Matching & Cross-Text Multiple Matching
    const matching = exercise as MultipleMatchingExercise | CrossTextMatchingExercise;
    const textLetters = matching.texts.map((t) => t.letter);

    return (
      <div className="space-y-3.5">
        {matching.items.map((item) => {
          const selected = letterAnswers[item.number] || '';
          const isRev = revealAll || Boolean(revealedItems[item.number]);
          const isOk = selected === item.correctLetter;

          return (
            <div
              key={item.id}
              id={`presenter-item-${item.number}`}
              className="p-4 rounded-xl border space-y-3"
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="font-medium leading-snug"
                  style={{
                    color: 'var(--text-primary)',
                    fontSize: 'calc(var(--reader-font-size) * 0.94)',
                  }}
                >
                  <span className="font-mono font-bold mr-2 tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                    {item.number}.
                  </span>
                  {item.question}
                </div>
                {!studentMode && (
                  <button
                    type="button"
                    onClick={() => toggleItemReveal(item.number)}
                    className="text-xs font-medium cursor-pointer hover:underline shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {isRev ? 'Hide Key' : 'Show Key'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {textLetters.map((ltr) => {
                    const isSelected = selected === ltr;
                    const isCorrectLtr = item.correctLetter === ltr;
                    const highlightCorrect = (isRev || checked) && isCorrectLtr;
                    const highlightWrong = checked && isSelected && !isCorrectLtr;

                    return (
                      <button
                        key={ltr}
                        type="button"
                        onClick={() =>
                          setLetterAnswers((prev) => ({ ...prev, [item.number]: ltr }))
                        }
                        className="w-10 h-9 rounded-lg font-mono text-sm font-bold border cursor-pointer transition-colors"
                        style={{
                          backgroundColor: highlightCorrect
                            ? 'var(--success-bg)'
                            : highlightWrong
                              ? 'var(--error-bg)'
                              : isSelected
                                ? 'var(--accent-bg)'
                                : 'var(--bg-elevated)',
                          borderColor: highlightCorrect
                            ? 'var(--success-fg)'
                            : highlightWrong
                              ? 'var(--error-fg)'
                              : isSelected
                                ? 'var(--accent-bg)'
                                : 'var(--border-subtle)',
                          color: highlightCorrect
                            ? 'var(--success-fg)'
                            : highlightWrong
                              ? 'var(--error-fg)'
                              : isSelected
                                ? 'var(--accent-text)'
                                : 'var(--text-primary)',
                        }}
                      >
                        {ltr}
                      </button>
                    );
                  })}
                </div>

                {checked && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-semibold"
                    style={{ color: isOk ? 'var(--success-fg)' : 'var(--error-fg)' }}
                  >
                    {isOk ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Correct
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        Key: {item.correctLetter}
                      </>
                    )}
                  </span>
                )}
              </div>

              {isRev && item.explanation && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong>Note:</strong> {item.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Presentation Action Strip */}
      <div
        className="no-print flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {studentMode ? 'Shared Exercise Copy' : 'Presentation View'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {studentMode ? 'Answer key excluded · Panels scroll independently' : 'Panels scroll independently'}
          </span>
          {score && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-bold tabular-nums" style={{ color: 'var(--accent-fg)' }}>
                Score: {score.correct} / {score.total}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!studentMode && (
            <>
              <button
                type="button"
                onClick={() => setChecked((c) => !c)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: checked ? 'var(--accent-bg)' : 'var(--bg-panel)',
                  borderColor: checked ? 'var(--accent-bg)' : 'var(--border-subtle)',
                  color: checked ? 'var(--accent-text)' : 'var(--text-primary)',
                }}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {checked ? 'Hide Check' : 'Check Answers'}
              </button>

              <button
                type="button"
                onClick={handleToggleRevealAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: effectiveRevealAll ? 'var(--accent-soft)' : 'var(--bg-panel)',
                  borderColor: effectiveRevealAll ? 'var(--accent-fg)' : 'var(--border-subtle)',
                  color: effectiveRevealAll ? 'var(--accent-fg)' : 'var(--text-primary)',
                }}
              >
                {effectiveRevealAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {effectiveRevealAll ? 'Hide Answer Key' : 'Reveal All Answers'}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: 'var(--bg-panel)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Dual Independent Scrollable & Resizable Panels */}
      <DualSplitContainer
        leftAriaLabel={meta.leftPanelLabel}
        rightAriaLabel={meta.rightPanelLabel}
        splitRatio={splitRatio}
        onSplitRatioChange={onSplitRatioChange}
        leftPaddingClass="p-5 sm:p-6 lg:p-10"
        rightPaddingClass="p-5 sm:p-6 lg:p-10"
        leftPanel={<div className="max-w-3xl mx-auto">{renderLeftPanel()}</div>}
        rightPanel={<div className="max-w-2xl mx-auto">{renderRightPanel()}</div>}
      />
    </div>
  );
};
