import {
  AccessibilitySettings,
  EXERCISE_TYPES,
  Exercise,
} from '../types/exercise';
import { escapeHtml } from './htmlSanitizer';
import { stripExerciseAnswers } from './stripAnswers';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Pure-JS SHA-256 (works offline & on file:// origins without crypto.subtle restrictions)
export function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);

  const bitLen = bytes.length * 8;
  const padLen = ((bytes.length + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 4, bitLen >>> 0, false);
  view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);

  const W = new Uint32Array(64);
  for (let i = 0; i < padLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
      const s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e;
      e = (d + temp1) >>> 0;
      d = c; c = b; b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
  return out;
}

function encryptAnswerPayload(payload: unknown, password: string): { salt: string; cipher: string } {
  const encoder = new TextEncoder();
  const saltBytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(saltBytes);
  } else {
    for (let i = 0; i < 12; i++) saltBytes[i] = Math.floor(Math.random() * 256);
  }
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  const plainStr = 'LEXIS_KEY_V1:' + JSON.stringify(payload);
  const plainBytes = encoder.encode(plainStr);
  const cipherBytes = new Uint8Array(plainBytes.length);

  let offset = 0;
  let blockIdx = 0;
  while (offset < plainBytes.length) {
    const keyBlock = sha256Bytes(encoder.encode(`${salt}:${password}:${blockIdx++}`));
    for (let i = 0; i < keyBlock.length && offset < plainBytes.length; i++, offset++) {
      cipherBytes[offset] = plainBytes[offset] ^ keyBlock[i];
    }
  }

  let binary = '';
  for (let i = 0; i < cipherBytes.length; i++) {
    binary += String.fromCharCode(cipherBytes[i]);
  }
  return { salt, cipher: btoa(binary) };
}

interface AnswerEntry {
  key: string;
  note?: string;
}

function buildExerciseMarkup(
  exercise: Exercise,
  exIdx: number,
  answersMap: Record<string, AnswerEntry>
): { title: string; typeTitle: string; leftHtml: string; rightHtml: string } {
  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type)!;

  const formatGapTokens = (html: string, showStem: boolean): string => {
    return html.replace(
      /<span[^>]*data-gap="(\d+)"[^>]*>(.*?)<\/span>/gi,
      (_match, gapNum) => {
        const stemMatch = _match.match(/data-stem="([^"]+)"/i);
        const stem = stemMatch ? stemMatch[1].toUpperCase() : '';
        if (showStem || stem) {
          return `<span class="gap-slot">[${gapNum}] __________ <strong class="stem-word">${escapeHtml(stem)}</strong></span>`;
        }
        return `<span class="gap-slot">[${gapNum}] __________</span>`;
      }
    );
  };

  let leftBody = '';
  let rightBody = '';

  if (exercise.type === 'multiple-choice-cloze') {
    leftBody = formatGapTokens(exercise.passageHtml, false);
    rightBody = exercise.items
      .map((it) => {
        const slotId = `e${exIdx}-g${it.gapNumber}`;
        answersMap[slotId] = {
          key: `Key: ${LETTERS[it.correctIndex]} (${it.options[it.correctIndex] || ''})`,
          note: it.explanation || undefined,
        };
        return `
        <div class="q-card">
          <div class="q-head"><strong>Gap ${it.gapNumber}</strong><span class="answer-key" data-ans-id="${slotId}"></span></div>
          <div class="opts-grid">
            ${it.options
              .map(
                (o, idx) =>
                  `<div class="opt-item"><span class="opt-ltr">${LETTERS[idx]}</span> ${escapeHtml(o)}</div>`
              )
              .join('')}
          </div>
          <div class="note" data-note-id="${slotId}"></div>
        </div>`;
      })
      .join('');
  } else if (exercise.type === 'open-cloze') {
    leftBody = formatGapTokens(exercise.passageHtml, false);
    rightBody = exercise.items
      .map((it) => {
        const slotId = `e${exIdx}-g${it.gapNumber}`;
        answersMap[slotId] = {
          key: it.acceptedAnswers.filter(Boolean).join(' / '),
          note: it.explanation || undefined,
        };
        return `
        <div class="q-card">
          <div class="q-head"><strong>Gap ${it.gapNumber}</strong><span class="answer-key" data-ans-id="${slotId}"></span></div>
          <div class="blank-line">Answer: ________________________</div>
          <div class="note" data-note-id="${slotId}"></div>
        </div>`;
      })
      .join('');
  } else if (exercise.type === 'word-formation') {
    leftBody = formatGapTokens(exercise.passageHtml, true);
    rightBody = exercise.items
      .map((it) => {
        const slotId = `e${exIdx}-g${it.gapNumber}`;
        answersMap[slotId] = {
          key: it.acceptedAnswers.filter(Boolean).join(' / '),
          note: it.explanation || undefined,
        };
        return `
        <div class="q-card">
          <div class="q-head"><strong>Gap ${it.gapNumber} · <span class="stem-word">${escapeHtml(it.stemWord)}</span></strong><span class="answer-key" data-ans-id="${slotId}"></span></div>
          <div class="blank-line">Answer: ________________________</div>
          <div class="note" data-note-id="${slotId}"></div>
        </div>`;
      })
      .join('');
  } else if (exercise.type === 'key-word-transformation') {
    leftBody =
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
    rightBody = exercise.items
      .map((it) => {
        const slotId = `e${exIdx}-k${it.number}`;
        answersMap[slotId] = {
          key: `Accepted: ${it.acceptedAnswers.filter(Boolean).join(' | ')}`,
          note: it.explanation || undefined,
        };
        return `
        <div class="q-card">
          <div class="q-head"><strong>Item ${it.number} (${escapeHtml(it.keyWord.toUpperCase())})</strong></div>
          <div class="answer-key" data-ans-id="${slotId}"></div>
          <div class="note" data-note-id="${slotId}"></div>
        </div>`;
      })
      .join('');
  } else if (exercise.type === 'multiple-choice') {
    leftBody = exercise.passageHtml;
    rightBody = exercise.items
      .map((it) => {
        const slotId = `e${exIdx}-mc${it.number}`;
        answersMap[slotId] = {
          key: `Key: ${LETTERS[it.correctIndex]}`,
          note: it.explanation || undefined,
        };
        return `
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
          <div class="answer-key" style="margin-top:8px;" data-ans-id="${slotId}"></div>
          <div class="note" data-note-id="${slotId}"></div>
        </div>`;
      })
      .join('');
  } else if (exercise.type === 'gapped-text') {
    leftBody = formatGapTokens(exercise.passageHtml, false);
    rightBody =
      `<div class="q-card"><strong>Gap Key</strong><div class="opts-grid" style="margin-top:8px;">` +
      exercise.gaps
        .map((g) => {
          const slotId = `e${exIdx}-gt${g.gapNumber}`;
          answersMap[slotId] = {
            key: `Option ${g.correctLetter}`,
            note: g.explanation || undefined,
          };
          return `<div>Gap ${g.gapNumber}: <span class="answer-key" data-ans-id="${slotId}"></span></div>`;
        })
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
    leftBody = exercise.texts
      .map(
        (t) => `
        <article class="text-section">
          <h3><span class="opt-ltr">${escapeHtml(t.letter)}</span> ${escapeHtml(t.title)}</h3>
          <div>${t.html}</div>
        </article>`
      )
      .join('');
    rightBody = exercise.items
      .map((it) => {
        const slotId = `e${exIdx}-m${it.number}`;
        answersMap[slotId] = {
          key: `Text ${it.correctLetter}`,
          note: it.explanation || undefined,
        };
        return `
        <div class="q-card">
          <div class="q-head"><span><strong>${it.number}.</strong> ${escapeHtml(it.question)}</span><span class="answer-key" data-ans-id="${slotId}"></span></div>
          <div class="note" data-note-id="${slotId}"></div>
        </div>`;
      })
      .join('');
  }

  const leftHtml = `
    <div class="meta">${escapeHtml(meta.title)}</div>
    <h1>${escapeHtml(exercise.title)}</h1>
    <div class="instructions">${escapeHtml(exercise.instructions)}</div>
    ${leftBody}
  `;

  return {
    title: exercise.title || 'Untitled',
    typeTitle: meta.title,
    leftHtml,
    rightHtml: rightBody,
  };
}

function renderHtmlDocument(
  pageTitle: string,
  exercises: Exercise[],
  a11y: AccessibilitySettings,
  password: string,
  folderLabel?: string
): string {
  const answersMap: Record<string, AnswerEntry> = {};
  const renderedExercises = exercises.map((ex, idx) =>
    buildExerciseMarkup(ex, idx, answersMap)
  );
  const encrypted = encryptAnswerPayload(answersMap, password);
  const safeExportJson = JSON.stringify({
    folderName: folderLabel || undefined,
    exercises: exercises.map(stripExerciseAnswers),
  }).replace(/<\//g, '<\\/');

  const initialThemeClass =
    a11y.theme === 'warm-cream'
      ? 'theme-cream'
      : a11y.theme === 'slate-dark'
        ? 'theme-dark'
        : a11y.theme === 'high-contrast'
          ? 'theme-contrast'
          : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      --bg: #F6F5F1;
      --panel: #FFFFFF;
      --elevated: #EFECE4;
      --text: #18181B;
      --muted: #52525B;
      --border: #DDD9CE;
      --border-strong: #B8B2A2;
      --accent: #2E3A8C;
      --accent-soft: rgba(46, 58, 140, 0.12);
      --font-size: ${a11y.fontSize}px;
      --line-height: ${a11y.lineHeight};
      --split: ${a11y.splitRatio}%;
    }
    body.theme-cream { --bg: #EFE7D8; --panel: #F7F1E5; --elevated: #EAE0CE; --text: #231B14; --muted: #6B5A4B; --border: #D8CBB5; --border-strong: #B8A58B; --accent: #854D0E; --accent-soft: rgba(133,77,14,0.14); }
    body.theme-dark { --bg: #0B1120; --panel: #111827; --elevated: #1E293B; --text: #F8FAFC; --muted: #94A3B8; --border: #334155; --border-strong: #475569; --accent: #38BDF8; --accent-soft: rgba(56,189,248,0.18); }
    body.theme-contrast { --bg: #000000; --panel: #050505; --elevated: #141414; --text: #FFFFFF; --muted: #FEF08A; --border: #3F3F46; --border-strong: #FACC15; --accent: #FACC15; --accent-soft: rgba(250,204,21,0.22); }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header.topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 20px; background: var(--panel); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    button, select, input { font: inherit; font-size: 13px; padding: 6px 11px; border-radius: 8px; border: 1px solid var(--border); background: var(--elevated); color: var(--text); }
    button, select { cursor: pointer; font-weight: 600; }
    button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
    body.theme-contrast button.primary, body.theme-dark button.primary { color: #000; }
    main.split { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    main.split.landscape { flex-direction: row; }
    section.pane { min-height: 0; min-width: 0; overflow-y: auto; padding: 24px 30px; font-size: var(--font-size); line-height: var(--line-height); }
    section.left-pane { background: var(--panel); flex: 0 0 var(--split); }
    section.right-pane { flex: 1 1 auto; }
    .resizer { flex: 0 0 12px; background: var(--elevated); border-left: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; align-items: center; justify-content: center; touch-action: none; cursor: col-resize; }
    main.split:not(.landscape) .resizer { border-left: none; border-right: none; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); cursor: row-resize; }
    .resizer-grip { width: 22px; height: 44px; border-radius: 999px; background: var(--panel); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); user-select: none; }
    main.split:not(.landscape) .resizer-grip { width: 44px; height: 22px; }
    .ex-panel { display: none; }
    .ex-panel.active { display: block; }
    h1 { margin: 0 0 8px 0; font-size: 1.6em; line-height: 1.25; }
    .meta { font-size: 13px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
    .instructions { font-size: 0.9em; color: var(--muted); padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
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
    .answer-key { display: none; color: var(--accent); font-weight: 700; }
    body.show-answers .answer-key.unlocked { display: inline-block; }
    .note { display: none; font-weight: 400; color: var(--muted); font-size: 0.85em; margin-top: 8px; }
    body.show-answers .note.unlocked { display: block; }
    .pw-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; padding: 16px; z-index: 50; }
    .pw-modal-backdrop.open { display: flex; }
    .pw-modal { width: 100%; max-width: 360px; background: var(--panel); border: 1px solid var(--border-strong); border-radius: 12px; padding: 20px; }
  </style>
</head>
<body class="${initialThemeClass}">
  <header class="topbar">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      ${folderLabel ? `<strong>${escapeHtml(folderLabel)}</strong>` : ''}
      ${
        renderedExercises.length > 1
          ? `<select id="ex-select" onchange="selectExercise(this.value)" aria-label="Choose exercise">
              ${renderedExercises
                .map(
                  (re, idx) =>
                    `<option value="${idx}">${escapeHtml(re.typeTitle)} — ${escapeHtml(re.title)}</option>`
                )
                .join('')}
            </select>`
          : `<strong>${escapeHtml(renderedExercises[0].title)}</strong> <span style="color:var(--muted);font-size:13px;">· ${escapeHtml(renderedExercises[0].typeTitle)}</span>`
      }
    </div>
    <div class="controls">
      <button type="button" onclick="adjSize(-1)" aria-label="Decrease text size">A-</button>
      <button type="button" onclick="adjSize(1)" aria-label="Increase text size">A+</button>
      <select onchange="setTheme(this.value)" aria-label="Colour theme">
        <option value="" ${initialThemeClass === '' ? 'selected' : ''}>Paper Light</option>
        <option value="theme-cream" ${initialThemeClass === 'theme-cream' ? 'selected' : ''}>Warm Cream</option>
        <option value="theme-dark" ${initialThemeClass === 'theme-dark' ? 'selected' : ''}>Slate Dark</option>
        <option value="theme-contrast" ${initialThemeClass === 'theme-contrast' ? 'selected' : ''}>High Contrast</option>
      </select>
      <button type="button" id="key-btn" class="primary" onclick="handleKeyClick()">Unlock Answer Key</button>
    </div>
  </header>

  <main class="split" id="split-root">
    <section class="pane left-pane" id="left-pane">
      ${renderedExercises
        .map(
          (re, idx) =>
            `<div class="ex-panel ${idx === 0 ? 'active' : ''}" data-ex-left="${idx}">${re.leftHtml}</div>`
        )
        .join('')}
    </section>
    <div class="resizer" id="resizer" role="separator" aria-label="Resize panels" title="Drag to resize panels">
      <div class="resizer-grip" aria-hidden="true">⋮</div>
    </div>
    <section class="pane right-pane">
      ${renderedExercises
        .map(
          (re, idx) =>
            `<div class="ex-panel ${idx === 0 ? 'active' : ''}" data-ex-right="${idx}">${re.rightHtml}</div>`
        )
        .join('')}
    </section>
  </main>

  <div class="pw-modal-backdrop" id="pw-modal">
    <form class="pw-modal" onsubmit="submitUnlock(event)">
      <div style="font-weight:700;font-size:16px;margin-bottom:6px;">Unlock Answer Key</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Enter the password set when this file was exported.</div>
      <input type="password" id="pw-input" placeholder="Password" style="width:100%;margin-bottom:8px;" />
      <div id="pw-err" style="color:#dc2626;font-size:12px;margin-bottom:10px;display:none;">Incorrect password.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" onclick="closePwModal()">Cancel</button>
        <button type="submit" class="primary">Unlock</button>
      </div>
    </form>
  </div>

  <script type="application/json" id="wysiwygr-export-data">${safeExportJson}</script>
  <script>
    var curSize = ${a11y.fontSize};
    var keysUnlocked = false;
    var SALT = ${JSON.stringify(encrypted.salt)};
    var CIPHER_B64 = ${JSON.stringify(encrypted.cipher)};

    function adjSize(d) {
      curSize = Math.min(28, Math.max(14, curSize + d));
      document.documentElement.style.setProperty('--font-size', curSize + 'px');
    }
    function setTheme(cls) {
      var hasAns = document.body.classList.contains('show-answers');
      document.body.className = (hasAns ? 'show-answers ' : '') + cls;
    }
    function selectExercise(idx) {
      document.querySelectorAll('[data-ex-left]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-ex-left') === String(idx));
      });
      document.querySelectorAll('[data-ex-right]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-ex-right') === String(idx));
      });
    }

    // Landscape orientation + draggable resizer
    var splitRoot = document.getElementById('split-root');
    var resizer = document.getElementById('resizer');
    function updateOrient() {
      var land = window.innerWidth > window.innerHeight;
      splitRoot.classList.toggle('landscape', land);
      resizer.querySelector('.resizer-grip').textContent = land ? '⋮' : '⋯';
    }
    updateOrient();
    window.addEventListener('resize', updateOrient);
    window.addEventListener('orientationchange', updateOrient);

    var dragging = false;
    resizer.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      resizer.setPointerCapture(e.pointerId);
      dragging = true;
    });
    resizer.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      var rect = splitRoot.getBoundingClientRect();
      var land = splitRoot.classList.contains('landscape');
      var pct = land ? ((e.clientX - rect.left) / rect.width) * 100 : ((e.clientY - rect.top) / rect.height) * 100;
      pct = Math.min(82, Math.max(18, pct));
      document.documentElement.style.setProperty('--split', pct + '%');
    });
    function endDrag(e) {
      if (!dragging) return;
      if (resizer.hasPointerCapture && resizer.hasPointerCapture(e.pointerId)) resizer.releasePointerCapture(e.pointerId);
      dragging = false;
    }
    resizer.addEventListener('pointerup', endDrag);
    resizer.addEventListener('pointercancel', endDrag);

    // Pure-JS SHA-256 for offline answer decryption
    function sha256(bytes) {
      var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
      var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
      var bitLen = bytes.length * 8;
      var padLen = (bytes.length + 9 + 63) & ~63;
      var padded = new Uint8Array(padLen);
      padded.set(bytes);
      padded[bytes.length] = 0x80;
      var view = new DataView(padded.buffer);
      view.setUint32(padLen - 4, bitLen >>> 0, false);
      view.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000) >>> 0, false);
      var W = new Uint32Array(64);
      for (var i = 0; i < padLen; i += 64) {
        for (var t = 0; t < 16; t++) W[t] = view.getUint32(i + t * 4, false);
        for (var t = 16; t < 64; t++) {
          var s0 = ((W[t-15]>>>7)|(W[t-15]<<25))^((W[t-15]>>>18)|(W[t-15]<<14))^(W[t-15]>>>3);
          var s1 = ((W[t-2]>>>17)|(W[t-2]<<15))^((W[t-2]>>>19)|(W[t-2]<<13))^(W[t-2]>>>10);
          W[t] = (W[t-16] + s0 + W[t-7] + s1) >>> 0;
        }
        var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
        for (var t = 0; t < 64; t++) {
          var S1 = ((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
          var ch = (e&f)^(~e&g);
          var t1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
          var S0 = ((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
          var maj = (a&b)^(a&c)^(b&c);
          var t2 = (S0 + maj) >>> 0;
          h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
        }
        H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;
        H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
      }
      var out = new Uint8Array(32);
      var ov = new DataView(out.buffer);
      for (var i = 0; i < 8; i++) ov.setUint32(i * 4, H[i], false);
      return out;
    }

    function handleKeyClick() {
      if (keysUnlocked) {
        document.body.classList.toggle('show-answers');
        document.getElementById('key-btn').textContent =
          document.body.classList.contains('show-answers') ? 'Hide Answer Key' : 'Show Answer Key';
        return;
      }
      document.getElementById('pw-err').style.display = 'none';
      document.getElementById('pw-input').value = '';
      document.getElementById('pw-modal').classList.add('open');
      setTimeout(function() { document.getElementById('pw-input').focus(); }, 20);
    }
    function closePwModal() {
      document.getElementById('pw-modal').classList.remove('open');
    }
    function submitUnlock(e) {
      e.preventDefault();
      var pw = document.getElementById('pw-input').value.trim();
      var bin = atob(CIPHER_B64);
      var cBytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) cBytes[i] = bin.charCodeAt(i);
      var pBytes = new Uint8Array(cBytes.length);
      var enc = new TextEncoder();
      var off = 0, blk = 0;
      while (off < cBytes.length) {
        var kb = sha256(enc.encode(SALT + ':' + pw + ':' + (blk++)));
        for (var j = 0; j < kb.length && off < cBytes.length; j++, off++) {
          pBytes[off] = cBytes[off] ^ kb[j];
        }
      }
      var decoded = '';
      try { decoded = new TextDecoder('utf-8', { fatal: true }).decode(pBytes); } catch (_) { decoded = ''; }
      if (decoded.indexOf('LEXIS_KEY_V1:') !== 0) {
        document.getElementById('pw-err').style.display = 'block';
        return;
      }
      var data = JSON.parse(decoded.slice('LEXIS_KEY_V1:'.length));
      Object.keys(data).forEach(function(id) {
        var entry = data[id];
        var ansEl = document.querySelector('[data-ans-id="' + id + '"]');
        if (ansEl) {
          ansEl.textContent = entry.key || '';
          ansEl.classList.add('unlocked');
        }
        var noteEl = document.querySelector('[data-note-id="' + id + '"]');
        if (noteEl && entry.note) {
          noteEl.textContent = entry.note;
          noteEl.classList.add('unlocked');
        }
      });
      keysUnlocked = true;
      document.body.classList.add('show-answers');
      document.getElementById('key-btn').textContent = 'Hide Answer Key';
      closePwModal();
    }
  </script>
</body>
</html>`;
}

export function buildStandaloneHtml(
  exercise: Exercise,
  a11y: AccessibilitySettings,
  password: string
): string {
  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type)!;
  return renderHtmlDocument(
    `${exercise.title || 'Exercise'} — ${meta.title}`,
    [exercise],
    a11y,
    password
  );
}

export function buildFolderStandaloneHtml(
  folderName: string,
  exercises: Exercise[],
  a11y: AccessibilitySettings,
  password: string
): string {
  return renderHtmlDocument(
    `${folderLabelSafe(folderName)} — Exercise Pack`,
    exercises,
    a11y,
    password,
    folderName
  );
}

function folderLabelSafe(name: string): string {
  return name.trim() || 'Folder';
}

export function buildStudentOfflineHtml(
  rawExercise: Exercise,
  a11y: AccessibilitySettings
): string {
  const exercise = stripExerciseAnswers(rawExercise);
  const meta = EXERCISE_TYPES.find((m) => m.type === exercise.type)!;
  const dummyAnswers: Record<string, AnswerEntry> = {};
  const rendered = buildExerciseMarkup(exercise, 0, dummyAnswers);
  const safeExportJson = JSON.stringify({
    exercises: [exercise],
  }).replace(/<\//g, '<\\/');

  const initialThemeClass =
    a11y.theme === 'warm-cream'
      ? 'theme-cream'
      : a11y.theme === 'slate-dark'
        ? 'theme-dark'
        : a11y.theme === 'high-contrast'
          ? 'theme-contrast'
          : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(rendered.title)} — Student Copy</title>
  <style>
    :root {
      --bg: #F6F5F1; --panel: #FFFFFF; --elevated: #EFECE4;
      --text: #18181B; --muted: #52525B; --border: #DDD9CE; --border-strong: #B8B2A2;
      --accent: #2E3A8C; --accent-soft: rgba(46, 58, 140, 0.12);
      --font-size: ${a11y.fontSize}px; --line-height: ${a11y.lineHeight}; --split: ${a11y.splitRatio}%;
    }
    body.theme-cream { --bg: #EFE7D8; --panel: #F7F1E5; --elevated: #EAE0CE; --text: #231B14; --muted: #6B5A4B; --border: #D8CBB5; --border-strong: #B8A58B; --accent: #854D0E; --accent-soft: rgba(133,77,14,0.14); }
    body.theme-dark { --bg: #0B1120; --panel: #111827; --elevated: #1E293B; --text: #F8FAFC; --muted: #94A3B8; --border: #334155; --border-strong: #475569; --accent: #38BDF8; --accent-soft: rgba(56,189,248,0.18); }
    body.theme-contrast { --bg: #000000; --panel: #050505; --elevated: #141414; --text: #FFFFFF; --muted: #FEF08A; --border: #3F3F46; --border-strong: #FACC15; --accent: #FACC15; --accent-soft: rgba(250,204,21,0.22); }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header.topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 20px; background: var(--panel); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    button, select, input { font: inherit; font-size: 13px; padding: 6px 11px; border-radius: 8px; border: 1px solid var(--border); background: var(--elevated); color: var(--text); }
    button, select { cursor: pointer; font-weight: 600; }
    main.split { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    main.split.landscape { flex-direction: row; }
    section.pane { min-height: 0; min-width: 0; overflow-y: auto; padding: 24px 30px; font-size: var(--font-size); line-height: var(--line-height); }
    section.left-pane { background: var(--panel); flex: 0 0 var(--split); }
    section.right-pane { flex: 1 1 auto; }
    .resizer { flex: 0 0 12px; background: var(--elevated); border-left: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; align-items: center; justify-content: center; touch-action: none; cursor: col-resize; }
    main.split:not(.landscape) .resizer { border-left: none; border-right: none; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); cursor: row-resize; }
    .resizer-grip { width: 22px; height: 44px; border-radius: 999px; background: var(--panel); border: 1px solid var(--border-strong); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--muted); user-select: none; }
    main.split:not(.landscape) .resizer-grip { width: 44px; height: 22px; }
    h1 { margin: 0 0 8px 0; font-size: 1.6em; line-height: 1.25; }
    .meta { font-size: 13px; color: var(--muted); margin-bottom: 8px; font-weight: 600; }
    .instructions { font-size: 0.9em; color: var(--muted); padding-bottom: 16px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .gap-slot { display: inline-block; padding: 1px 8px; margin: 0 3px; border-radius: 6px; background: var(--accent-soft); color: var(--accent); font-weight: 700; }
    .stem-word { text-transform: uppercase; font-weight: 800; letter-spacing: 0.04em; }
    .q-card { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; margin-bottom: 14px; }
    .q-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
    .opts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .opts-col { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .opt-item { padding: 8px 10px; border-radius: 6px; background: var(--elevated); border: 1px solid var(--border); cursor: pointer; }
    .opt-item.selected { background: var(--accent-soft); border-color: var(--accent); }
    .opt-ltr { display: inline-flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 5px; background: var(--accent-soft); color: var(--accent); font-weight: 700; margin-right: 6px; font-size: 0.85em; }
    .kwt-line { margin-bottom: 6px; }
    .kwt-key { margin: 6px 0; font-size: 0.95em; letter-spacing: 0.06em; color: var(--accent); }
    .text-section { padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .student-input { width: 100%; margin-top: 6px; padding: 8px 10px; font-size: 0.95em; background: var(--elevated); color: var(--text); border: 1px solid var(--border); border-radius: 8px; }
    .blank-line { display: none; }
    .answer-key, .note { display: none !important; }
  </style>
</head>
<body class="${initialThemeClass}">
  <header class="topbar">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <strong>${escapeHtml(rendered.title)}</strong>
      <span style="color:var(--muted);font-size:13px;">· ${escapeHtml(meta.title)} · Offline Copy</span>
    </div>
    <div class="controls">
      <button type="button" onclick="adjSize(-1)" aria-label="Decrease text size">A-</button>
      <button type="button" onclick="adjSize(1)" aria-label="Increase text size">A+</button>
      <select onchange="setTheme(this.value)" aria-label="Colour theme">
        <option value="" ${initialThemeClass === '' ? 'selected' : ''}>Paper Light</option>
        <option value="theme-cream" ${initialThemeClass === 'theme-cream' ? 'selected' : ''}>Warm Cream</option>
        <option value="theme-dark" ${initialThemeClass === 'theme-dark' ? 'selected' : ''}>Slate Dark</option>
        <option value="theme-contrast" ${initialThemeClass === 'theme-contrast' ? 'selected' : ''}>High Contrast</option>
      </select>
    </div>
  </header>
  <main class="split" id="split-root">
    <section class="pane left-pane">${rendered.leftHtml}</section>
    <div class="resizer" id="resizer" role="separator" aria-label="Resize panels" title="Drag to resize panels">
      <div class="resizer-grip" aria-hidden="true">⋮</div>
    </div>
    <section class="pane right-pane">${rendered.rightHtml}</section>
  </main>
  <script type="application/json" id="wysiwygr-export-data">${safeExportJson}</script>
  <script>
    var curSize = ${a11y.fontSize};
    function adjSize(d) {
      curSize = Math.min(28, Math.max(14, curSize + d));
      document.documentElement.style.setProperty('--font-size', curSize + 'px');
    }
    function setTheme(cls) { document.body.className = cls; }
    var splitRoot = document.getElementById('split-root');
    var resizer = document.getElementById('resizer');
    function updateOrient() {
      var land = window.innerWidth > window.innerHeight;
      splitRoot.classList.toggle('landscape', land);
      resizer.querySelector('.resizer-grip').textContent = land ? '⋮' : '⋯';
    }
    updateOrient();
    window.addEventListener('resize', updateOrient);
    window.addEventListener('orientationchange', updateOrient);
    var dragging = false;
    resizer.addEventListener('pointerdown', function(e) { e.preventDefault(); resizer.setPointerCapture(e.pointerId); dragging = true; });
    resizer.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      var rect = splitRoot.getBoundingClientRect();
      var land = splitRoot.classList.contains('landscape');
      var pct = land ? ((e.clientX - rect.left) / rect.width) * 100 : ((e.clientY - rect.top) / rect.height) * 100;
      document.documentElement.style.setProperty('--split', Math.min(82, Math.max(18, pct)) + '%');
    });
    function endDrag(e) { if (!dragging) return; if (resizer.hasPointerCapture && resizer.hasPointerCapture(e.pointerId)) resizer.releasePointerCapture(e.pointerId); dragging = false; }
    resizer.addEventListener('pointerup', endDrag);
    resizer.addEventListener('pointercancel', endDrag);

    // Enable interactive clicks & note inputs in offline student copy
    document.querySelectorAll('.opt-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var parent = item.parentElement;
        if (parent) parent.querySelectorAll('.opt-item').forEach(function(s) { s.classList.remove('selected'); });
        item.classList.add('selected');
      });
    });
    document.querySelectorAll('.blank-line').forEach(function(el) {
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'student-input';
      inp.placeholder = 'Type your answer...';
      el.parentNode.insertBefore(inp, el.nextSibling);
    });
  </script>
</body>
</html>`;
}

