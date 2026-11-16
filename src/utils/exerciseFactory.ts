import {
  EXERCISE_TYPES,
  Exercise,
  ExerciseType,
} from '../types/exercise';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createBlankExercise(type: ExerciseType): Exercise {
  const meta = EXERCISE_TYPES.find((m) => m.type === type)!;
  const now = new Date().toISOString();
  const base = {
    id: uid('ex'),
    title: `New ${meta.title}`,
    subtitle: `${meta.partLabel} · ${meta.title}`,
    instructions: '',
    updatedAt: now,
  };

  switch (type) {
    case 'multiple-choice-cloze':
      return {
        ...base,
        type: 'multiple-choice-cloze',
        instructions:
          'Read the text below and decide which answer best fits each gap.',
        passageHtml:
          '<p>Write or paste your reading text here, then place your cursor where a gap should appear and click <strong>Insert Gap</strong> (<span data-gap="1">[1]</span>).</p>',
        optionCount: 4,
        items: [
          {
            id: uid('mcc'),
            gapNumber: 1,
            options: ['', '', '', ''],
            correctIndex: 0,
          },
        ],
      };

    case 'open-cloze':
      return {
        ...base,
        type: 'open-cloze',
        instructions:
          'Read the text below and think of the word which best fits each gap. Use only one word in each gap.',
        passageHtml:
          '<p>Write or paste your text here, then click <strong>Insert Gap</strong> (<span data-gap="1">[1]</span>) to create numbered gaps.</p>',
        items: [
          {
            id: uid('oc'),
            gapNumber: 1,
            acceptedAnswers: [''],
          },
        ],
      };

    case 'word-formation':
      return {
        ...base,
        type: 'word-formation',
        instructions:
          'Read the text below. Use the word given in capitals next to each gap to form a word that fits in the gap.',
        passageHtml:
          '<p>Write or paste your text here, then insert gaps paired with root words (<span data-gap="1" data-stem="WORD">[1] <strong class="wf-stem">WORD</strong></span>).</p>',
        items: [
          {
            id: uid('wf'),
            gapNumber: 1,
            stemWord: 'WORD',
            acceptedAnswers: [''],
          },
        ],
      };

    case 'key-word-transformation':
      return {
        ...base,
        type: 'key-word-transformation',
        instructions:
          'Complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Do not change the word given.',
        introHtml: '',
        items: [
          {
            id: uid('kwt'),
            number: 1,
            originalSentence: '',
            keyWord: 'KEY',
            gappedSentence: 'Write the second sentence with __________ here.',
            acceptedAnswers: [''],
          },
        ],
      };

    case 'multiple-choice':
      return {
        ...base,
        type: 'multiple-choice',
        instructions:
          'You are going to read a text. For each question, choose the answer which you think fits best according to the text.',
        passageHtml: '<p>Write or paste your reading passage here.</p>',
        items: [
          {
            id: uid('mc'),
            number: 1,
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
          },
        ],
      };

    case 'gapped-text':
      return {
        ...base,
        type: 'gapped-text',
        instructions:
          'You are going to read an article from which paragraphs or sentences have been removed. Choose from the options the one which fits each gap. There is an extra option which you do not need to use.',
        passageHtml:
          '<p>Write or paste your passage here and insert numbered gaps (<span data-gap="1">[1]</span>) where sentences or paragraphs have been removed.</p>',
        gaps: [
          {
            id: uid('gtg'),
            gapNumber: 1,
            correctLetter: 'A',
          },
        ],
        options: [
          { id: uid('gto'), letter: 'A', html: '<p></p>' },
          { id: uid('gto'), letter: 'B', html: '<p></p>' },
        ],
      };

    case 'multiple-matching':
      return {
        ...base,
        type: 'multiple-matching',
        instructions:
          'You are going to read a series of texts. For questions 1–10, choose from the sections (A–D). The sections may be chosen more than once.',
        texts: [
          { id: uid('mmt'), letter: 'A', title: 'Section A', html: '<p></p>' },
          { id: uid('mmt'), letter: 'B', title: 'Section B', html: '<p></p>' },
          { id: uid('mmt'), letter: 'C', title: 'Section C', html: '<p></p>' },
          { id: uid('mmt'), letter: 'D', title: 'Section D', html: '<p></p>' },
        ],
        items: Array.from({ length: 10 }, (_, idx) => ({
          id: uid('mmq'),
          number: idx + 1,
          question: '',
          correctLetter: 'A',
        })),
      };

    case 'cross-text-matching':
      return {
        ...base,
        type: 'cross-text-matching',
        instructions:
          'You are going to read four texts on a shared topic. For questions 1–4, choose from the writers (A–D). The writers may be chosen more than once.',
        texts: [
          { id: uid('ctt'), letter: 'A', title: 'Text A', html: '<p></p>' },
          { id: uid('ctt'), letter: 'B', title: 'Text B', html: '<p></p>' },
          { id: uid('ctt'), letter: 'C', title: 'Text C', html: '<p></p>' },
          { id: uid('ctt'), letter: 'D', title: 'Text D', html: '<p></p>' },
        ],
        items: Array.from({ length: 4 }, (_, idx) => ({
          id: uid('ctq'),
          number: idx + 1,
          question: '',
          correctLetter: 'A',
        })),
      };
  }
}
