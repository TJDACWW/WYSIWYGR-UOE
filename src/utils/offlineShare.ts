import {
  EXERCISE_TYPES,
  Exercise,
} from '../types/exercise';
import { stripExerciseAnswers } from './stripAnswers';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<span[^>]*data-gap="(\d+)"[^>]*>[\s\S]*?<\/span>/gi, '[$1] ______')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  root.querySelectorAll('span[data-gap]').forEach((span) => {
    const gapNum = span.getAttribute('data-gap') || '1';
    const stem = span.getAttribute('data-stem');
    const token = stem
      ? `[${gapNum}] ______ (${stem.toUpperCase()})`
      : `[${gapNum}] ______`;
    span.replaceWith(doc.createTextNode(token));
  });

  root.querySelectorAll('br').forEach((br) => {
    br.replaceWith(doc.createTextNode('\n'));
  });

  root.querySelectorAll('p, div, h2, h3, li, blockquote').forEach((block) => {
    block.appendChild(doc.createTextNode('\n\n'));
  });

  return (root.textContent || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatExerciseAsOfflineText(rawExercise: Exercise): string {
  const ex = stripExerciseAnswers(rawExercise);
  const meta = EXERCISE_TYPES.find((m) => m.type === ex.type);
  const lines: string[] = [];

  lines.push(ex.title || 'Untitled Exercise');
  if (meta) lines.push(meta.title);
  if (ex.instructions) lines.push(ex.instructions);
  lines.push('');

  if (ex.type === 'multiple-choice-cloze') {
    lines.push(htmlToPlainText(ex.passageHtml));
    lines.push('');
    lines.push('OPTIONS:');
    ex.items.forEach((it) => {
      const opts = it.options
        .map((o, idx) => `${LETTERS[idx]}) ${o || '...'}`)
        .join('   ');
      lines.push(`${it.gapNumber}. ${opts}`);
    });
  } else if (ex.type === 'open-cloze' || ex.type === 'word-formation') {
    lines.push(htmlToPlainText(ex.passageHtml));
  } else if (ex.type === 'key-word-transformation') {
    if (ex.introHtml) {
      const intro = htmlToPlainText(ex.introHtml);
      if (intro) {
        lines.push(intro);
        lines.push('');
      }
    }
    ex.items.forEach((it) => {
      lines.push(`${it.number}. ${it.originalSentence}`);
      lines.push(`   ${it.keyWord.toUpperCase()}`);
      lines.push(`   ${it.gappedSentence}`);
      lines.push('');
    });
  } else if (ex.type === 'multiple-choice') {
    lines.push(htmlToPlainText(ex.passageHtml));
    lines.push('');
    lines.push('QUESTIONS:');
    ex.items.forEach((it) => {
      lines.push(`${it.number}. ${it.question}`);
      it.options.forEach((o, idx) => {
        lines.push(`   ${LETTERS[idx]}) ${o}`);
      });
      lines.push('');
    });
  } else if (ex.type === 'gapped-text') {
    lines.push(htmlToPlainText(ex.passageHtml));
    lines.push('');
    lines.push('REMOVED OPTIONS:');
    ex.options.forEach((opt) => {
      lines.push(`${opt.letter}. ${htmlToPlainText(opt.html)}`);
      lines.push('');
    });
  } else {
    ex.texts.forEach((t) => {
      lines.push(`[${t.letter}] ${t.title}`);
      lines.push(htmlToPlainText(t.html));
      lines.push('');
    });
    lines.push('QUESTIONS:');
    ex.items.forEach((it) => {
      lines.push(`${it.number}. ${it.question}`);
    });
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export interface OfflineQrChunk {
  index: number;
  total: number;
  label: string;
  payload: string;
}

export function splitTextIntoQrChunks(
  text: string,
  title: string,
  maxChars = 1550
): OfflineQrChunk[] {
  if (text.length <= maxChars) {
    return [
      {
        index: 0,
        total: 1,
        label: 'Complete Exercise (Offline)',
        payload: text,
      },
    ];
  }

  const paragraphs = text.split(/\n{2,}/);
  const rawChunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) {
      rawChunks.push(current.trim());
      current = '';
    }
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      pushCurrent();
      const lines = para.split('\n');
      for (const line of lines) {
        if (line.length > maxChars) {
          pushCurrent();
          let start = 0;
          while (start < line.length) {
            let end = Math.min(start + maxChars, line.length);
            if (end < line.length) {
              const spaceIdx = line.lastIndexOf(' ', end);
              if (spaceIdx > start + maxChars * 0.5) end = spaceIdx;
            }
            rawChunks.push(line.slice(start, end).trim());
            start = end;
          }
        } else if ((current ? current.length + 1 : 0) + line.length > maxChars) {
          pushCurrent();
          current = line;
        } else {
          current = current ? `${current}\n${line}` : line;
        }
      }
      continue;
    }

    if ((current ? current.length + 2 : 0) + para.length > maxChars) {
      pushCurrent();
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  pushCurrent();

  const total = rawChunks.length;
  return rawChunks.map((chunk, index) => ({
    index,
    total,
    label: `Part ${index + 1} of ${total}`,
    payload: `[Part ${index + 1}/${total} — ${title || 'Exercise'}]\n\n${chunk}`,
  }));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function compressExerciseToToken(exercise: Exercise): Promise<string> {
  const stripped = stripExerciseAnswers(exercise);
  const json = JSON.stringify(stripped);
  const rawBytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(rawBytes);
      writer.close();
      const compressedBuf = await new Response(cs.readable).arrayBuffer();
      return `z.${bytesToBase64Url(new Uint8Array(compressedBuf))}`;
    } catch {
      // Fallback to uncompressed
    }
  }
  return `u.${bytesToBase64Url(rawBytes)}`;
}

export async function decompressExerciseFromToken(
  token: string
): Promise<Exercise | null> {
  try {
    if (token.startsWith('u.')) {
      const bytes = base64UrlToBytes(token.slice(2));
      const json = new TextDecoder().decode(bytes);
      return stripExerciseAnswers(JSON.parse(json) as Exercise);
    }
    if (token.startsWith('z.') && typeof DecompressionStream !== 'undefined') {
      const bytes = base64UrlToBytes(token.slice(2));
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(new Uint8Array(bytes));
      writer.close();
      const decompressedBuf = await new Response(ds.readable).arrayBuffer();
      const json = new TextDecoder().decode(decompressedBuf);
      return stripExerciseAnswers(JSON.parse(json) as Exercise);
    }
    return null;
  } catch {
    return null;
  }
}

export interface CompactHtmlQrResult {
  html: string;
  dataUri: string;
  byteLength: number;
  maxBytes: number;
  fitsQr: boolean;
}

function escapeCompactHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cleanCompactPassageHtml(html: string): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<span[^>]*data-gap="(\d+)"[^>]*data-stem="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, (_m, g, st) =>
        `<span class=g>[${g}] ____ (${String(st).toUpperCase()})</span>`
      )
      .replace(/<span[^>]*data-gap="(\d+)"[^>]*>[\s\S]*?<\/span>/gi, '<span class=g>[$1] ____</span>')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';
  root.querySelectorAll('script,style,iframe,object,embed').forEach((el) => el.remove());
  root.querySelectorAll('*').forEach((el) => {
    const gap = el.getAttribute('data-gap');
    const stem = el.getAttribute('data-stem');
    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }
    if (gap) {
      el.setAttribute('class', 'g');
      el.textContent = stem ? `[${gap}] ____ (${stem.toUpperCase()})` : `[${gap}] ____`;
    }
  });
  return root.innerHTML.replace(/\s+/g, ' ').trim();
}

export function buildCompactMinimalHtml(rawExercise: Exercise): CompactHtmlQrResult {
  const ex = stripExerciseAnswers(rawExercise);
  const meta = EXERCISE_TYPES.find((m) => m.type === ex.type);
  const parts: string[] = [];

  parts.push(`<h1>${escapeCompactHtml(ex.title || 'Exercise')}</h1>`);
  if (meta || ex.instructions) {
    parts.push(
      `<div class=m>${meta ? escapeCompactHtml(meta.title) : ''}${meta && ex.instructions ? ' · ' : ''}${ex.instructions ? escapeCompactHtml(ex.instructions) : ''}</div>`
    );
  }

  if (ex.type === 'multiple-choice-cloze') {
    parts.push(`<div class=p>${cleanCompactPassageHtml(ex.passageHtml)}</div>`);
    ex.items.forEach((it) => {
      const opts = it.options
        .map((o, idx) => `<span class=o><b>${LETTERS[idx]})</b> ${escapeCompactHtml(o)}</span>`)
        .join(' ');
      parts.push(`<div class=q><b>${it.gapNumber}.</b> ${opts}</div>`);
    });
  } else if (ex.type === 'open-cloze' || ex.type === 'word-formation') {
    parts.push(`<div class=p>${cleanCompactPassageHtml(ex.passageHtml)}</div>`);
  } else if (ex.type === 'key-word-transformation') {
    if (ex.introHtml) {
      parts.push(`<div class=p>${cleanCompactPassageHtml(ex.introHtml)}</div>`);
    }
    ex.items.forEach((it) => {
      parts.push(
        `<div class=q><div><b>${it.number}.</b> ${escapeCompactHtml(it.originalSentence)}</div><div><b>${escapeCompactHtml(it.keyWord.toUpperCase())}</b></div><div>${escapeCompactHtml(it.gappedSentence)}</div></div>`
      );
    });
  } else if (ex.type === 'multiple-choice') {
    parts.push(`<div class=p>${cleanCompactPassageHtml(ex.passageHtml)}</div>`);
    ex.items.forEach((it) => {
      const opts = it.options
        .map((o, idx) => `<div class=o><b>${LETTERS[idx]})</b> ${escapeCompactHtml(o)}</div>`)
        .join('');
      parts.push(`<div class=q><div><b>${it.number}.</b> ${escapeCompactHtml(it.question)}</div>${opts}</div>`);
    });
  } else if (ex.type === 'gapped-text') {
    parts.push(`<div class=p>${cleanCompactPassageHtml(ex.passageHtml)}</div>`);
    ex.options.forEach((opt) => {
      parts.push(`<div class=q><b>${escapeCompactHtml(opt.letter)}.</b> ${cleanCompactPassageHtml(opt.html)}</div>`);
    });
  } else {
    ex.texts.forEach((t) => {
      parts.push(
        `<div class=q><b>[${escapeCompactHtml(t.letter)}] ${escapeCompactHtml(t.title)}</b><div>${cleanCompactPassageHtml(t.html)}</div></div>`
      );
    });
    ex.items.forEach((it) => {
      parts.push(`<div class=q><b>${it.number}.</b> ${escapeCompactHtml(it.question)}</div>`);
    });
  }

  const css =
    'body{font:15px/1.5 system-ui,sans-serif;max-width:44em;margin:14px auto;padding:0 12px;color:#111}' +
    'h1{font-size:1.25em;margin:0 0 4px}.m{font-size:12px;color:#555;margin-bottom:10px}' +
    '.p{margin-bottom:12px}.p p{margin:0 0 8px}.g{background:#e8ecff;padding:0 4px;border-radius:3px;font-weight:700}' +
    '.q{border-top:1px solid #ddd;padding:7px 0}.o{display:inline-block;margin:2px 8px 2px 0}';

  const html = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${escapeCompactHtml(ex.title || 'Exercise')}</title><style>${css}</style>${parts.join('')}`;
  const encodedBody = html
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/\r?\n/g, ' ');
  const dataUri = `data:text/html;charset=utf-8,${encodedBody}`;
  const byteLength = new TextEncoder().encode(dataUri).length;
  const maxBytes = 2953;

  return {
    html,
    dataUri,
    byteLength,
    maxBytes,
    fitsQr: byteLength <= maxBytes,
  };
}

