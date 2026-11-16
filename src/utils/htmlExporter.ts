import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
} from '../types/exercise';
import { escapeHtml } from './htmlSanitizer';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Generates a self-contained single-file HTML presentation of any exercise
 * with dual independently scrollable side-by-side panels, accessibility controls
 * (text size & colour themes), and an interactive "Reveal Answers" toggle.
 */
export function buildStandaloneHtml(
  exercise: Exercise,
  a11y: AccessibilitySettings
): string {
  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type)!;

  const formatGapTokens = (html: string, showStem: boolean): string => {
    return html.replace(
      /<span[^>]*data-gap="(\d+)"[^>]*>(.*?)<\/span>/gi,
      (_match, gapNum, inner) => {
        const stemMatch = _match.match(/data-stem="([^"]+)"/i);
        const stem = stemMatch ? stemMatch[1].toUpperCase() : '';
        if (showStem || stem) {
          return `<span class="gap-slot">[${gapNum}] __________ <strong class="stem-word">${escapeHtml(stem)}</strong></span>`;
        }
        return `<span class="gap-slot">[${gapNum}] __________</span>`;
      }
    );
  };

  let leftHtml = '';
  let rightHtml = '';

  if (exercise.type === 'multiple-choice-cloze') {
    leftHtml = formatGapTokens(exercise.passageHtml, false);
    rightHtml = exercise.items
      .map(
        (it) => `
        <div class="q-card">
          <div class="q-head"><strong>Gap ${it.gapNumber}</strong><span class="answer-key" data-answer>Key: ${LETTERS[it.correctIndex]} (${escapeHtml(it.options[it.correctIndex] || '')})</span></div>
          <div class="opts-grid">
            ${it.options
              .map(
                (o, idx) =>
                  `<div class="opt-item"><span class="opt-ltr">${LETTERS[idx]}</span> ${escapeHtml(o)}</div>`
              )
              .join('')}
          </div>
          ${it.explanation ? `<div class="note" data-answer>${escapeHtml(it.explanation)}</div>` : ''}
        </div>`
      )
      .join('');
  } else if (exercise.type === 'open-cloze') {
    leftHtml = formatGapTokens(exercise.passageHtml, false);
    rightHtml = exercise.items
      .map(
        (it) => `
        <div class="q-card">
          <div class="q-head"><strong>Gap ${it.gapNumber}</strong><span class="answer-key" data-answer>${escapeHtml(it.acceptedAnswers.join(' / '))}</span></div>
          <div class="blank-line">Answer: ________________________</div>
          ${it.explanation ? `<div class="note" data-answer>${escapeHtml(it.explanation)}</div>` : ''}
        </div>`
      )
      .join('');
  } else if (exercise.type === 'word-formation') {
    leftHtml = formatGapTokens(exercise.passageHtml, true);
    rightHtml = exercise.items
      .map(
        (it) => `
        <div class="q-card">
          <div class="q-head"><strong>Gap ${it.gapNumber} · <span class="stem-word">${escapeHtml(it.stemWord)}</span></strong><span class="answer-key" data-answer>${escapeHtml(it.acceptedAnswers.join(' / '))}</span></div>
          <div class="blank-line">Answer: ________________________</div>
          ${it.explanation ? `<div class="note" data-answer>${escapeHtml(it.explanation)}</div>` : ''}
        </div>`
      )
      .join('');
  } else if (exercise.type === 'key-word-transformation') {
    leftHtml =
      (exercise.introHtml || '') +
      exercise.items
        .map(
          (it) => `
        <div class="q-card">
          <div class="kwt-line"><strong>${it.number}.</strong> ${escapeHtml(it.originalSentence)}</div>
          <div class="kwt-key"><strong>${escapeHtml(it.keyWord.toUpperCase())}</strong></div>
          <div class="kwt-line">${escapeHtml(it.gappedSentence)}</div>
        </div>`
        )
        .join('');
    rightHtml = exercise.items
      .map(
        (it) => `
        <div class="q-card">
          <div class="q-head"><strong>Item ${it.number} (${escapeHtml(it.keyWord.toUpperCase())})</strong></div>
          <div class="answer-key" data-answer>Accepted: ${escapeHtml(it.acceptedAnswers.join(' | '))}</div>
          ${it.explanation ? `<div class="note" data-answer>${escapeHtml(it.explanation)}</div>` : ''}
        </div>`
      )
      .join('');
  } else if (exercise.type === 'multiple-choice') {
    leftHtml = exercise.passageHtml;
    rightHtml = exercise.items
      .map(
        (it) => `
        <div class="q-card">
          <div class="q-stem"><strong>${it.number}.</strong> ${escapeHtml(it.question)}</div>
          <div class="opts-col">
            ${it.options
              .map(
                (o, idx) =>
                  `<div class="opt-item"><span class="opt-ltr">${LETTERS[idx]}</span> ${escapeHtml(o)}</div>`
              )
              .join('')}
          </div>
          <div class="answer-key" data-answer>Key: ${LETTERS[it.correctIndex]}</div>
          ${it.explanation ? `<div class="note" data-answer>${escapeHtml(it.explanation)}</div>` : ''}
        </div>`
      )
      .join('');
  } else if (exercise.type === 'gapped-text') {
    leftHtml = formatGapTokens(exercise.passageHtml, false);
    rightHtml =
      `<div class="q-card"><strong>Gap Key</strong><div class="opts-grid" style="margin-top:8px;">` +
      exercise.gaps
        .map(
          (g) =>
            `<div>Gap ${g.gapNumber}: <span class="answer-key" data-answer>Option ${g.correctLetter}</span></div>`
        )
        .join('') +
      `</div></div>` +
      exercise.options
        .map(
          (o) => `
        <div class="q-card">
          <div class="q-head"><strong>Option ${escapeHtml(o.letter)}</strong></div>
          <div>${o.html}</div>
        </div>`
        )
        .join('');
  } else {
    leftHtml = exercise.texts
      .map(
        (t) => `
        <article class="text-section">
          <h3><span class="opt-ltr">${escapeHtml(t.letter)}</span> ${escapeHtml(t.title)}</h3>
          <div>${t.html}</div>
        </article>`
      )
      .join('');
    rightHtml = exercise.items
      .map(
        (it) => `
        <div class="q-card">
          <div class="q-head"><span><strong>${it.number}.</strong> ${escapeHtml(it.question)}</span><span class="answer-key" data-answer>Text ${escapeHtml(it.correctLetter)}</span></div>
          ${it.explanation ? `<div class="note" data-answer>${escapeHtml(it.explanation)}</div>` : ''}
        </div>`
      )
      .join('');
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(exercise.title)} — ${escapeHtml(meta.title)}</title>
  <style>
    :root {
      --bg: #F6F5F1;
      --panel: #FFFFFF;
      --elevated: #EFECE4;
      --text: #18181B;
      --muted: #52525B;
      --border: #DDD9CE;
      --accent: #2E3A8C;
      --accent-soft: rgba(46, 58, 140, 0.12);
      --font-size: ${a11y.fontSize}px;
      --line-height: ${a11y.lineHeight};
    }
    body.theme-cream { --bg: #EFE7D8; --panel: #F7F1E5; --elevated: #EAE0CE; --text: #231B14; --muted: #6B5A4B; --border: #D8CBB5; --accent: #854D0E; --accent-soft: rgba(133,77,14,0.14); }
    body.theme-dark { --bg: #0B1120; --panel: #111827; --elevated: #1E293B; --text: #F8FAFC; --muted: #94A3B8; --border: #334155; --accent: #38BDF8; --accent-soft: rgba(56,189,248,0.18); }
    body.theme-contrast { --bg: #000000; --panel: #050505; --elevated: #141414; --text: #FFFFFF; --muted: #FEF08A; --border: #FACC15; --accent: #FACC15; --accent-soft: rgba(250,204,21,0.22); }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header.topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 24px; background: var(--panel); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    button, select { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--elevated); color: var(--text); cursor: pointer; font-weight: 600; }
    button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    body.theme-contrast button.primary, body.theme-dark button.primary { color: #000; }
    main.split { flex: 1; min-height: 0; display: grid; grid-template-columns: ${a11y.splitRatio}% ${100 - a11y.splitRatio}%; }
    @media (max-width: 960px) { main.split { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; } }
    section.pane { height: 100%; overflow-y: auto; padding: 28px 36px; font-size: var(--font-size); line-height: var(--line-height); }
    section.left-pane { background: var(--panel); border-right: 1px solid var(--border); }
    h1 { margin: 0 0 8px 0; font-size: 1.65em; line-height: 1.25; }
    .meta { font-size: 13px; color: var(--muted); margin-bottom: 10px; font-weight: 600; }
    .instructions { font-size: 0.9em; color: var(--muted); padding-bottom: 18px; margin-bottom: 22px; border-bottom: 1px solid var(--border); }
    .gap-slot { display: inline-block; padding: 1px 8px; margin: 0 3px; border-radius: 6px; background: var(--accent-soft); color: var(--accent); font-weight: 700; }
    .stem-word { text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; }
    .q-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .q-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
    .opts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .opts-col { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .opt-item { padding: 8px 10px; border-radius: 6px; background: var(--elevated); border: 1px solid var(--border); }
    .opt-ltr { display: inline-flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-weight: 700; margin-right: 6px; font-size: 0.85em; }
    .kwt-line { margin-bottom: 6px; }
    .kwt-key { margin: 6px 0; font-size: 0.95em; letter-spacing: 0.06em; color: var(--accent); }
    .text-section { padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    [data-answer] { display: none; color: var(--accent); font-weight: 700; }
    body.show-answers [data-answer] { display: inline-block; }
    .note[data-answer] { display: none; font-weight: 400; color: var(--muted); font-size: 0.85em; margin-top: 8px; }
    body.show-answers .note[data-answer] { display: block; }
  </style>
</head>
<body class="${a11y.theme === 'warm-cream' ? 'theme-cream' : a11y.theme === 'slate-dark' ? 'theme-dark' : a11y.theme === 'high-contrast' ? 'theme-contrast' : ''}">
  <header class="topbar">
    <div><strong>${escapeHtml(exercise.title)}</strong> · <span style="color:var(--muted);font-size:13px;">${escapeHtml(meta.title)}</span></div>
    <div class="controls">
      <button type="button" onclick="adjSize(-1)">A-</button>
      <button type="button" onclick="adjSize(1)">A+</button>
      <select onchange="document.body.className = (document.body.classList.contains('show-answers') ? 'show-answers ' : '') + this.value" aria-label="Colour theme">
        <option value="">Paper Light</option>
        <option value="theme-cream">Warm Cream</option>
        <option value="theme-dark">Slate Dark</option>
        <option value="theme-contrast">High Contrast</option>
      </select>
      <button type="button" class="primary" onclick="document.body.classList.toggle('show-answers')">Toggle Answer Key</button>
    </div>
  </header>
  <main class="split">
    <section class="pane left-pane">
      <div class="meta">${escapeHtml(meta.partLabel)} · ${escapeHtml(meta.title)}</div>
      <h1>${escapeHtml(exercise.title)}</h1>
      <div class="instructions">${escapeHtml(exercise.instructions)}</div>
      ${leftHtml}
    </section>
    <section class="pane">${rightHtml}</section>
  </main>
  <script>
    var curSize = ${a11y.fontSize};
    function adjSize(d) {
      curSize = Math.min(28, Math.max(14, curSize + d));
      document.documentElement.style.setProperty('--font-size', curSize + 'px');
    }
  </script>
</body>
</html>`;
}
