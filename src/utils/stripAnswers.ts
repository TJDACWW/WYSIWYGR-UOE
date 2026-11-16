import { Exercise } from '../types/exercise';

/**
 * Returns a deep-cloned copy of an exercise with all answer keys,
 * accepted answers, correct indices/letters, and explanations stripped.
 */
export function stripExerciseAnswers(exercise: Exercise): Exercise {
  const base = {
    id: exercise.id,
    type: exercise.type,
    title: exercise.title,
    subtitle: exercise.subtitle,
    instructions: exercise.instructions,
    updatedAt: exercise.updatedAt,
  };

  switch (exercise.type) {
    case 'multiple-choice-cloze':
      return {
        ...base,
        type: 'multiple-choice-cloze',
        passageHtml: exercise.passageHtml,
        optionCount: exercise.optionCount,
        items: exercise.items.map((it) => ({
          id: it.id,
          gapNumber: it.gapNumber,
          options: [...it.options],
          correctIndex: -1,
        })),
      };

    case 'open-cloze':
      return {
        ...base,
        type: 'open-cloze',
        passageHtml: exercise.passageHtml,
        items: exercise.items.map((it) => ({
          id: it.id,
          gapNumber: it.gapNumber,
          acceptedAnswers: [],
        })),
      };

    case 'word-formation':
      return {
        ...base,
        type: 'word-formation',
        passageHtml: exercise.passageHtml,
        items: exercise.items.map((it) => ({
          id: it.id,
          gapNumber: it.gapNumber,
          stemWord: it.stemWord,
          acceptedAnswers: [],
        })),
      };

    case 'key-word-transformation':
      return {
        ...base,
        type: 'key-word-transformation',
        introHtml: exercise.introHtml,
        items: exercise.items.map((it) => ({
          id: it.id,
          number: it.number,
          originalSentence: it.originalSentence,
          keyWord: it.keyWord,
          gappedSentence: it.gappedSentence,
          acceptedAnswers: [],
        })),
      };

    case 'multiple-choice':
      return {
        ...base,
        type: 'multiple-choice',
        passageHtml: exercise.passageHtml,
        items: exercise.items.map((it) => ({
          id: it.id,
          number: it.number,
          question: it.question,
          options: [...it.options],
          correctIndex: -1,
        })),
      };

    case 'gapped-text':
      return {
        ...base,
        type: 'gapped-text',
        passageHtml: exercise.passageHtml,
        gaps: exercise.gaps.map((g) => ({
          id: g.id,
          gapNumber: g.gapNumber,
          correctLetter: '',
        })),
        options: exercise.options.map((o) => ({
          id: o.id,
          letter: o.letter,
          html: o.html,
        })),
      };

    case 'multiple-matching':
      return {
        ...base,
        type: 'multiple-matching',
        texts: exercise.texts.map((t) => ({
          id: t.id,
          letter: t.letter,
          title: t.title,
          html: t.html,
        })),
        items: exercise.items.map((it) => ({
          id: it.id,
          number: it.number,
          question: it.question,
          correctLetter: '',
        })),
      };

    case 'cross-text-matching':
      return {
        ...base,
        type: 'cross-text-matching',
        texts: exercise.texts.map((t) => ({
          id: t.id,
          letter: t.letter,
          title: t.title,
          html: t.html,
        })),
        items: exercise.items.map((it) => ({
          id: it.id,
          number: it.number,
          question: it.question,
          correctLetter: '',
        })),
      };
  }
}
