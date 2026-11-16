import {
  EXERCISE_TYPES,
  Exercise,
  ExerciseType,
  GappedTextGapItem,
  GappedTextOption,
  KeyWordTransformationItem,
  LetteredTextSection,
  MatchingQuestionItem,
  MultipleChoiceClozeItem,
  MultipleChoiceQuestionItem,
  OpenClozeItem,
  WordFormationItem,
} from '../types/exercise';
import { sha256Bytes } from './htmlExporter';
import { sanitizeExerciseHtml } from './htmlSanitizer';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export interface DecryptedAnswerEntry {
  key: string;
  note?: string;
}

export interface ParsedHtmlImport {
  exercises: Exercise[];
  folderName?: string;
  salt?: string;
  cipherB64?: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function restoreGapSpansFromDom(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  // Remove header metadata, title, and instructions wrapper
  clone
    .querySelectorAll(':scope > .meta, :scope > h1, :scope > .instructions')
    .forEach((el) => el.remove());

  clone.querySelectorAll('span.gap-slot').forEach((slot) => {
    const rawText = slot.textContent || '';
    const numMatch = rawText.match(/\[(\d+)\]/);
    if (!numMatch) return;
    const gapNum = numMatch[1];
    const stemEl = slot.querySelector('.stem-word');
    const stem = stemEl ? stemEl.textContent?.trim().toUpperCase() || '' : '';

    const replacement = document.createElement('span');
    replacement.setAttribute('data-gap', gapNum);
    if (stem) {
      replacement.setAttribute('data-stem', stem);
      replacement.innerHTML = `[${gapNum}] <strong class="wf-stem">${stem}</strong>`;
    } else {
      replacement.textContent = `[${gapNum}]`;
    }
    slot.replaceWith(replacement);
  });

  return sanitizeExerciseHtml(clone.innerHTML.trim() || '<p></p>');
}

function extractOptionTextWithoutLetter(optEl: Element): string {
  const clone = optEl.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.opt-ltr').forEach((el) => el.remove());
  return (clone.textContent || '').trim();
}

function parseLegacyDomExercise(
  leftPanel: Element,
  rightPanel: Element
): Exercise | null {
  const typeTitle = (leftPanel.querySelector('.meta')?.textContent || '').trim();
  const meta = EXERCISE_TYPES.find(
    (m) => m.title.toLowerCase() === typeTitle.toLowerCase()
  );
  if (!meta) return null;

  const title = (leftPanel.querySelector('h1')?.textContent || '').trim() || `Imported ${meta.title}`;
  const instructions = (leftPanel.querySelector('.instructions')?.textContent || '').trim();
  const now = new Date().toISOString();
  const base = {
    id: uid('ex'),
    title,
    subtitle: `${meta.partLabel} · ${meta.title}`,
    instructions,
    updatedAt: now,
  };

  const type: ExerciseType = meta.type;

  if (type === 'multiple-choice-cloze') {
    const passageHtml = restoreGapSpansFromDom(leftPanel as HTMLElement);
    const cards = Array.from(rightPanel.querySelectorAll('.q-card'));
    const items: MultipleChoiceClozeItem[] = cards.map((card, idx) => {
      const headText = card.querySelector('.q-head')?.textContent || '';
      const numMatch = headText.match(/Gap\s+(\d+)/i);
      const gapNumber = numMatch ? Number(numMatch[1]) : idx + 1;
      const options = Array.from(card.querySelectorAll('.opt-item')).map(
        extractOptionTextWithoutLetter
      );
      return {
        id: uid('mcc'),
        gapNumber,
        options: options.length > 0 ? options : ['', '', '', ''],
        correctIndex: 0,
      };
    });
    const optionCount = items[0]?.options.length || 4;
    return {
      ...base,
      type: 'multiple-choice-cloze',
      passageHtml,
      optionCount,
      items,
    };
  }

  if (type === 'open-cloze') {
    const passageHtml = restoreGapSpansFromDom(leftPanel as HTMLElement);
    const cards = Array.from(rightPanel.querySelectorAll('.q-card'));
    const items: OpenClozeItem[] = cards.map((card, idx) => {
      const headText = card.querySelector('.q-head')?.textContent || '';
      const numMatch = headText.match(/Gap\s+(\d+)/i);
      const gapNumber = numMatch ? Number(numMatch[1]) : idx + 1;
      return {
        id: uid('oc'),
        gapNumber,
        acceptedAnswers: [''],
      };
    });
    return { ...base, type: 'open-cloze', passageHtml, items };
  }

  if (type === 'word-formation') {
    const passageHtml = restoreGapSpansFromDom(leftPanel as HTMLElement);
    const cards = Array.from(rightPanel.querySelectorAll('.q-card'));
    const items: WordFormationItem[] = cards.map((card, idx) => {
      const headText = card.querySelector('.q-head')?.textContent || '';
      const numMatch = headText.match(/Gap\s+(\d+)/i);
      const gapNumber = numMatch ? Number(numMatch[1]) : idx + 1;
      const stemWord = (
        card.querySelector('.stem-word')?.textContent || 'WORD'
      )
        .trim()
        .toUpperCase();
      return {
        id: uid('wf'),
        gapNumber,
        stemWord,
        acceptedAnswers: [''],
      };
    });
    return { ...base, type: 'word-formation', passageHtml, items };
  }

  if (type === 'key-word-transformation') {
    const leftCards = Array.from(leftPanel.querySelectorAll('.q-card'));
    const items: KeyWordTransformationItem[] = leftCards.map((card, idx) => {
      const lines = Array.from(card.querySelectorAll('.kwt-line'));
      const firstLineClone = lines[0]?.cloneNode(true) as HTMLElement | undefined;
      let number = idx + 1;
      if (firstLineClone) {
        const numStrong = firstLineClone.querySelector('strong');
        const numMatch = numStrong?.textContent?.match(/(\d+)/);
        if (numMatch) number = Number(numMatch[1]);
        numStrong?.remove();
      }
      const originalSentence = (firstLineClone?.textContent || '').trim();
      const keyWord = (card.querySelector('.kwt-key')?.textContent || 'KEY')
        .trim()
        .toUpperCase();
      const gappedSentence = (lines[1]?.textContent || '').trim();
      return {
        id: uid('kwt'),
        number,
        originalSentence,
        keyWord,
        gappedSentence,
        acceptedAnswers: [''],
      };
    });
    return {
      ...base,
      type: 'key-word-transformation',
      introHtml: '',
      items,
    };
  }

  if (type === 'multiple-choice') {
    const passageHtml = restoreGapSpansFromDom(leftPanel as HTMLElement);
    const cards = Array.from(rightPanel.querySelectorAll('.q-card'));
    const items: MultipleChoiceQuestionItem[] = cards.map((card, idx) => {
      const stemEl = card.querySelector('.q-stem')?.cloneNode(true) as
        | HTMLElement
        | undefined;
      let number = idx + 1;
      if (stemEl) {
        const numStrong = stemEl.querySelector('strong');
        const numMatch = numStrong?.textContent?.match(/(\d+)/);
        if (numMatch) number = Number(numMatch[1]);
        numStrong?.remove();
      }
      const question = (stemEl?.textContent || '').trim();
      const options = Array.from(card.querySelectorAll('.opt-item')).map(
        extractOptionTextWithoutLetter
      );
      return {
        id: uid('mc'),
        number,
        question,
        options: options.length > 0 ? options : ['', '', '', ''],
        correctIndex: 0,
      };
    });
    return { ...base, type: 'multiple-choice', passageHtml, items };
  }

  if (type === 'gapped-text') {
    const passageHtml = restoreGapSpansFromDom(leftPanel as HTMLElement);
    const cards = Array.from(rightPanel.querySelectorAll('.q-card'));
    const gaps: GappedTextGapItem[] = [];
    const options: GappedTextOption[] = [];

    cards.forEach((card) => {
      const gapEls = Array.from(card.querySelectorAll('[data-ans-id]'));
      if (gapEls.length > 0) {
        gapEls.forEach((el, idx) => {
          const parentText = el.parentElement?.textContent || '';
          const m = parentText.match(/Gap\s+(\d+)/i);
          gaps.push({
            id: uid('gtg'),
            gapNumber: m ? Number(m[1]) : idx + 1,
            correctLetter: 'A',
          });
        });
        return;
      }

      const headText = (card.querySelector('.q-head')?.textContent || '').trim();
      const optMatch = headText.match(/Option\s+([A-Z])/i);
      if (optMatch) {
        const bodyEl = card.children[1] as HTMLElement | undefined;
        options.push({
          id: uid('gto'),
          letter: optMatch[1].toUpperCase(),
          html: sanitizeExerciseHtml(bodyEl?.innerHTML || '<p></p>'),
        });
      }
    });

    return { ...base, type: 'gapped-text', passageHtml, gaps, options };
  }

  // Multiple matching / Cross-text multiple matching
  const sections = Array.from(leftPanel.querySelectorAll('article.text-section'));
  const texts: LetteredTextSection[] = sections.map((sec, idx) => {
    const h3 = sec.querySelector('h3');
    const letter = (
      h3?.querySelector('.opt-ltr')?.textContent || LETTERS[idx] || 'A'
    )
      .trim()
      .toUpperCase();
    const h3Clone = h3?.cloneNode(true) as HTMLElement | undefined;
    h3Clone?.querySelectorAll('.opt-ltr').forEach((el) => el.remove());
    const secTitle = (h3Clone?.textContent || '').trim();
    const bodyEl = sec.querySelector('div');
    return {
      id: uid(type === 'cross-text-matching' ? 'ctt' : 'mmt'),
      letter,
      title: secTitle,
      html: sanitizeExerciseHtml(bodyEl?.innerHTML || '<p></p>'),
    };
  });

  const qCards = Array.from(rightPanel.querySelectorAll('.q-card'));
  const items: MatchingQuestionItem[] = qCards.map((card, idx) => {
    const headSpan = card.querySelector('.q-head > span')?.cloneNode(true) as
      | HTMLElement
      | undefined;
    let number = idx + 1;
    if (headSpan) {
      const numStrong = headSpan.querySelector('strong');
      const m = numStrong?.textContent?.match(/(\d+)/);
      if (m) number = Number(m[1]);
      numStrong?.remove();
    }
    const question = (headSpan?.textContent || '').trim();
    return {
      id: uid(type === 'cross-text-matching' ? 'ctq' : 'mmq'),
      number,
      question,
      correctLetter: texts[0]?.letter || 'A',
    };
  });

  if (type === 'cross-text-matching') {
    return { ...base, type: 'cross-text-matching', texts, items };
  }
  return { ...base, type: 'multiple-matching', texts, items };
}

export function parseExportedHtml(htmlText: string): ParsedHtmlImport | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    let salt: string | undefined;
    let cipherB64: string | undefined;
    const saltMatch = htmlText.match(/var\s+SALT\s*=\s*("[^"]*");/);
    const cipherMatch = htmlText.match(/var\s+CIPHER_B64\s*=\s*("[^"]*");/);
    if (saltMatch && cipherMatch) {
      try {
        salt = JSON.parse(saltMatch[1]);
        cipherB64 = JSON.parse(cipherMatch[1]);
      } catch {
        salt = undefined;
        cipherB64 = undefined;
      }
    }

    // Preferred path: structured export payload embedded in modern exports
    const dataScript = doc.getElementById('wysiwygr-export-data');
    if (dataScript && dataScript.textContent) {
      try {
        const parsed = JSON.parse(dataScript.textContent) as {
          folderName?: string;
          exercises?: Exercise[];
        };
        if (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
          return {
            exercises: parsed.exercises,
            folderName: parsed.folderName || undefined,
            salt,
            cipherB64,
          };
        }
      } catch {
        // Fall through to legacy DOM parsing
      }
    }

    // Legacy fallback: reconstruct exercises from exported HTML DOM
    const leftPanels = Array.from(doc.querySelectorAll('[data-ex-left]'));
    const rightPanels = Array.from(doc.querySelectorAll('[data-ex-right]'));
    if (leftPanels.length === 0 || leftPanels.length !== rightPanels.length) {
      return null;
    }

    const exercises: Exercise[] = [];
    for (let i = 0; i < leftPanels.length; i++) {
      const ex = parseLegacyDomExercise(leftPanels[i], rightPanels[i]);
      if (ex) exercises.push(ex);
    }

    if (exercises.length === 0) return null;

    let folderName: string | undefined;
    const exSelect = doc.getElementById('ex-select');
    if (exSelect) {
      const headerStrong = doc.querySelector('header.topbar > div > strong');
      const label = (headerStrong?.textContent || '').trim();
      if (label) folderName = label;
    }

    return {
      exercises,
      folderName,
      salt,
      cipherB64,
    };
  } catch {
    return null;
  }
}

export function decryptExportedAnswers(
  salt: string,
  cipherB64: string,
  password: string
): Record<string, DecryptedAnswerEntry> | null {
  try {
    const trimmedPw = password.trim();
    const bin = atob(cipherB64);
    const cBytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      cBytes[i] = bin.charCodeAt(i);
    }
    const pBytes = new Uint8Array(cBytes.length);
    const enc = new TextEncoder();
    let offset = 0;
    let blk = 0;
    while (offset < cBytes.length) {
      const kb = sha256Bytes(enc.encode(`${salt}:${trimmedPw}:${blk++}`));
      for (let j = 0; j < kb.length && offset < cBytes.length; j++, offset++) {
        pBytes[offset] = cBytes[offset] ^ kb[j];
      }
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(pBytes);
    if (!decoded.startsWith('LEXIS_KEY_V1:')) {
      return null;
    }
    return JSON.parse(decoded.slice('LEXIS_KEY_V1:'.length)) as Record<
      string,
      DecryptedAnswerEntry
    >;
  } catch {
    return null;
  }
}

export function applyAnswersToExercises(
  exercises: Exercise[],
  answersMap: Record<string, DecryptedAnswerEntry>
): Exercise[] {
  return exercises.map((ex, exIdx) => {
    if (ex.type === 'multiple-choice-cloze') {
      return {
        ...ex,
        items: ex.items.map((it) => {
          const entry = answersMap[`e${exIdx}-g${it.gapNumber}`];
          if (!entry) return it;
          const m = entry.key.match(/^Key:\s*([A-Z])/i);
          const idx = m ? LETTERS.indexOf(m[1].toUpperCase()) : -1;
          return {
            ...it,
            correctIndex: idx >= 0 ? idx : 0,
            explanation: entry.note || it.explanation,
          };
        }),
      };
    }

    if (ex.type === 'open-cloze') {
      return {
        ...ex,
        items: ex.items.map((it) => {
          const entry = answersMap[`e${exIdx}-g${it.gapNumber}`];
          if (!entry) return it;
          const ans = entry.key
            .split(/\s*\/\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
          return {
            ...it,
            acceptedAnswers: ans.length > 0 ? ans : [''],
            explanation: entry.note || it.explanation,
          };
        }),
      };
    }

    if (ex.type === 'word-formation') {
      return {
        ...ex,
        items: ex.items.map((it) => {
          const entry = answersMap[`e${exIdx}-g${it.gapNumber}`];
          if (!entry) return it;
          const ans = entry.key
            .split(/\s*\/\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
          return {
            ...it,
            acceptedAnswers: ans.length > 0 ? ans : [''],
            explanation: entry.note || it.explanation,
          };
        }),
      };
    }

    if (ex.type === 'key-word-transformation') {
      return {
        ...ex,
        items: ex.items.map((it) => {
          const entry = answersMap[`e${exIdx}-k${it.number}`];
          if (!entry) return it;
          const stripped = entry.key.replace(/^Accepted:\s*/i, '');
          const ans = stripped
            .split(/\s*\|\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
          return {
            ...it,
            acceptedAnswers: ans.length > 0 ? ans : [''],
            explanation: entry.note || it.explanation,
          };
        }),
      };
    }

    if (ex.type === 'multiple-choice') {
      return {
        ...ex,
        items: ex.items.map((it) => {
          const entry = answersMap[`e${exIdx}-mc${it.number}`];
          if (!entry) return it;
          const m = entry.key.match(/^Key:\s*([A-Z])/i);
          const idx = m ? LETTERS.indexOf(m[1].toUpperCase()) : -1;
          return {
            ...it,
            correctIndex: idx >= 0 ? idx : 0,
            explanation: entry.note || it.explanation,
          };
        }),
      };
    }

    if (ex.type === 'gapped-text') {
      return {
        ...ex,
        gaps: ex.gaps.map((g) => {
          const entry = answersMap[`e${exIdx}-gt${g.gapNumber}`];
          if (!entry) return g;
          const m = entry.key.match(/^Option\s+([A-Z])/i);
          return {
            ...g,
            correctLetter: m ? m[1].toUpperCase() : g.correctLetter,
            explanation: entry.note || g.explanation,
          };
        }),
      };
    }

    // multiple-matching & cross-text-matching
    return {
      ...ex,
      items: ex.items.map((it) => {
        const entry = answersMap[`e${exIdx}-m${it.number}`];
        if (!entry) return it;
        const m = entry.key.match(/^Text\s+([A-Z])/i);
        return {
          ...it,
          correctLetter: m ? m[1].toUpperCase() : it.correctLetter,
          explanation: entry.note || it.explanation,
        };
      }),
    };
  });
}

export function normalizeStrippedDefaults(exercises: Exercise[]): Exercise[] {
  return exercises.map((ex) => {
    if (ex.type === 'multiple-choice-cloze' || ex.type === 'multiple-choice') {
      return {
        ...ex,
        items: ex.items.map((it) => ({
          ...it,
          correctIndex: it.correctIndex >= 0 ? it.correctIndex : 0,
        })),
      } as Exercise;
    }
    if (ex.type === 'open-cloze' || ex.type === 'word-formation' || ex.type === 'key-word-transformation') {
      return {
        ...ex,
        items: ex.items.map((it) => ({
          ...it,
          acceptedAnswers: it.acceptedAnswers.length > 0 ? it.acceptedAnswers : [''],
        })),
      } as Exercise;
    }
    if (ex.type === 'gapped-text') {
      const fallback = ex.options[0]?.letter || 'A';
      return {
        ...ex,
        gaps: ex.gaps.map((g) => ({
          ...g,
          correctLetter: g.correctLetter || fallback,
        })),
      };
    }
    const fallback = ex.texts[0]?.letter || 'A';
    return {
      ...ex,
      items: ex.items.map((it) => ({
        ...it,
        correctLetter: it.correctLetter || fallback,
      })),
    };
  });
}
