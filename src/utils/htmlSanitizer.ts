/**
 * Sanitizes WYSIWYG HTML so pasted content preserves semantic structure
 * (paragraphs, bold, italic, underline, lists, headings, blockquotes, and gap tokens)
 * while stripping external inline colors, backgrounds, and font-sizes that would
 * override accessibility themes and text-size controls.
 */
export function sanitizeExerciseHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const ALLOWED_TAGS = new Set([
    'P',
    'BR',
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'H2',
    'H3',
    'UL',
    'OL',
    'LI',
    'BLOCKQUOTE',
    'SPAN',
    'DIV',
  ]);

  const cleanNode = (node: Node): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    // Preserve gap token spans cleanly
    if (el.hasAttribute('data-gap')) {
      const gapNum = el.getAttribute('data-gap') || '1';
      const stem = el.getAttribute('data-stem');
      const span = document.createElement('span');
      span.setAttribute('data-gap', gapNum);
      span.setAttribute('contenteditable', 'false');
      if (stem) {
        span.setAttribute('data-stem', stem.toUpperCase());
        span.innerHTML = `[${gapNum}] _____ (<strong>${escapeHtml(stem.toUpperCase())}</strong>)`;
      } else {
        span.textContent = `[${gapNum}]`;
      }
      return span;
    }

    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'META' || tag === 'LINK') {
      return null;
    }

    const targetTag = tag === 'DIV' ? 'P' : ALLOWED_TAGS.has(tag) ? tag : null;

    if (!targetTag) {
      const frag = document.createDocumentFragment();
      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cleanNode(child);
        if (cleaned) frag.appendChild(cleaned);
      });
      return frag;
    }

    const out = document.createElement(targetTag.toLowerCase());
    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) out.appendChild(cleaned);
    });

    // Unwrap empty plain spans
    if (targetTag === 'SPAN' && !el.hasAttribute('data-gap')) {
      const frag = document.createDocumentFragment();
      while (out.firstChild) {
        frag.appendChild(out.firstChild);
      }
      return frag;
    }

    return out;
  };

  const fragment = document.createDocumentFragment();
  Array.from(root.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) fragment.appendChild(cleaned);
  });

  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extracts gap numbers in document order from WYSIWYG passage HTML.
 */
export function extractGapTokensFromHtml(html: string): Array<{ gapNumber: number; stem?: string }> {
  if (!html || typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const spans = doc.querySelectorAll('[data-gap]');
  const seen = new Set<number>();
  const result: Array<{ gapNumber: number; stem?: string }> = [];
  spans.forEach((span) => {
    const rawNum = parseInt(span.getAttribute('data-gap') || '', 10);
    if (!Number.isNaN(rawNum) && !seen.has(rawNum)) {
      seen.add(rawNum);
      const stem = span.getAttribute('data-stem') || undefined;
      result.push({ gapNumber: rawNum, stem });
    }
  });
  return result;
}

/**
 * Updates stem attributes inside HTML when user edits a stem word in the right-side panel.
 */
export function syncStemsInHtml(
  html: string,
  stemByGapNumber: Record<number, string>
): string {
  if (!html || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return html;
  root.querySelectorAll('[data-gap]').forEach((el) => {
    const gapNum = parseInt(el.getAttribute('data-gap') || '', 10);
    if (!Number.isNaN(gapNum) && stemByGapNumber[gapNum] !== undefined) {
      const upperStem = stemByGapNumber[gapNum].toUpperCase();
      el.setAttribute('data-stem', upperStem);
      el.innerHTML = `[${gapNum}] _____ (<strong>${escapeHtml(upperStem || 'WORD')}</strong>)`;
    }
  });
  return root.innerHTML;
}

/**
 * Renumbers all gap tokens sequentially starting from 1 and returns updated HTML + mapping.
 */
export function renumberGapsInHtml(
  html: string,
  isWordFormation = false
): { html: string; mapping: Array<{ oldNumber: number; newNumber: number; stem?: string }> } {
  if (!html || typeof DOMParser === 'undefined') return { html, mapping: [] };
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return { html, mapping: [] };

  const mapping: Array<{ oldNumber: number; newNumber: number; stem?: string }> = [];
  let counter = 1;
  root.querySelectorAll('[data-gap]').forEach((el) => {
    const oldNum = parseInt(el.getAttribute('data-gap') || '', 10);
    const stem = el.getAttribute('data-stem') || undefined;
    const newNum = counter++;
    el.setAttribute('data-gap', String(newNum));
    if (isWordFormation || stem) {
      const upper = (stem || 'WORD').toUpperCase();
      el.setAttribute('data-stem', upper);
      el.innerHTML = `[${newNum}] _____ (<strong>${escapeHtml(upper)}</strong>)`;
    } else {
      el.textContent = `[${newNum}]`;
    }
    mapping.push({ oldNumber: Number.isNaN(oldNum) ? newNum : oldNum, newNumber: newNum, stem });
  });

  return { html: root.innerHTML, mapping };
}
