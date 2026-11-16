export type ExerciseType =
  | 'multiple-choice-cloze'
  | 'open-cloze'
  | 'word-formation'
  | 'key-word-transformation'
  | 'multiple-choice'
  | 'gapped-text'
  | 'multiple-matching'
  | 'cross-text-matching';

export interface ExerciseTypeMeta {
  type: ExerciseType;
  partLabel: string;
  title: string;
  shortTitle: string;
  description: string;
  leftPanelLabel: string;
  rightPanelLabel: string;
}

export const EXERCISE_TYPES: ExerciseTypeMeta[] = [
  {
    type: 'multiple-choice-cloze',
    partLabel: 'Type 1',
    title: 'Multiple Choice Cloze',
    shortTitle: 'MC Cloze',
    description: 'Text with numbered gaps and a configurable set of options for each gap.',
    leftPanelLabel: 'Reading Text',
    rightPanelLabel: 'Gap Options & Key',
  },
  {
    type: 'open-cloze',
    partLabel: 'Type 2',
    title: 'Open Cloze',
    shortTitle: 'Open Cloze',
    description: 'Text with simple open gaps where learners supply the missing word.',
    leftPanelLabel: 'Reading Text',
    rightPanelLabel: 'Gaps & Answer Key',
  },
  {
    type: 'word-formation',
    partLabel: 'Type 3',
    title: 'Word Formation',
    shortTitle: 'Word Formation',
    description: 'Text with gaps, each paired with an ALL CAPS BOLD root word next to the gap.',
    leftPanelLabel: 'Reading Text',
    rightPanelLabel: 'Root Words & Key',
  },
  {
    type: 'key-word-transformation',
    partLabel: 'Type 4',
    title: 'Key Word Transformation',
    shortTitle: 'Transformation',
    description: 'Three-line prompts: lead sentence, ALL CAPS BOLD key word, and gapped second sentence.',
    leftPanelLabel: 'Prompt Sentences',
    rightPanelLabel: 'Answer Slots & Key',
  },
  {
    type: 'multiple-choice',
    partLabel: 'Type 5',
    title: 'Multiple Choice',
    shortTitle: 'Multiple Choice',
    description: 'Long reading passage paired with comprehension questions and answer options.',
    leftPanelLabel: 'Long Passage',
    rightPanelLabel: 'Comprehension Questions',
  },
  {
    type: 'gapped-text',
    partLabel: 'Type 6',
    title: 'Gapped Text',
    shortTitle: 'Gapped Text',
    description: 'Passage with removed sentences/paragraphs and extra distractor options.',
    leftPanelLabel: 'Gapped Passage',
    rightPanelLabel: 'Removed Sentences (A–H)',
  },
  {
    type: 'multiple-matching',
    partLabel: 'Type 7',
    title: 'Multiple Matching',
    shortTitle: 'Multiple Matching',
    description: 'A set of lettered texts paired with 10 questions matched to text letters.',
    leftPanelLabel: 'Lettered Texts',
    rightPanelLabel: 'Matching Questions',
  },
  {
    type: 'cross-text-matching',
    partLabel: 'Type 8',
    title: 'Cross-Text Multiple Matching',
    shortTitle: 'Cross-Text Match',
    description: 'Four texts (A–D) paired with 4 comparative questions matched to text letters.',
    leftPanelLabel: 'Four Texts (A–D)',
    rightPanelLabel: 'Cross-Text Questions',
  },
];

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  title: string;
  subtitle: string;
  instructions: string;
  updatedAt: string;
}

export interface MultipleChoiceClozeItem {
  id: string;
  gapNumber: number;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface MultipleChoiceClozeExercise extends BaseExercise {
  type: 'multiple-choice-cloze';
  passageHtml: string;
  optionCount: number;
  items: MultipleChoiceClozeItem[];
}

export interface OpenClozeItem {
  id: string;
  gapNumber: number;
  acceptedAnswers: string[];
  explanation?: string;
}

export interface OpenClozeExercise extends BaseExercise {
  type: 'open-cloze';
  passageHtml: string;
  items: OpenClozeItem[];
}

export interface WordFormationItem {
  id: string;
  gapNumber: number;
  stemWord: string;
  acceptedAnswers: string[];
  explanation?: string;
}

export interface WordFormationExercise extends BaseExercise {
  type: 'word-formation';
  passageHtml: string;
  items: WordFormationItem[];
}

export interface KeyWordTransformationItem {
  id: string;
  number: number;
  originalSentence: string;
  keyWord: string;
  gappedSentence: string;
  acceptedAnswers: string[];
  explanation?: string;
}

export interface KeyWordTransformationExercise extends BaseExercise {
  type: 'key-word-transformation';
  introHtml: string;
  items: KeyWordTransformationItem[];
}

export interface MultipleChoiceQuestionItem {
  id: string;
  number: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'multiple-choice';
  passageHtml: string;
  items: MultipleChoiceQuestionItem[];
}

export interface GappedTextGapItem {
  id: string;
  gapNumber: number;
  correctLetter: string;
  explanation?: string;
}

export interface GappedTextOption {
  id: string;
  letter: string;
  html: string;
}

export interface GappedTextExercise extends BaseExercise {
  type: 'gapped-text';
  passageHtml: string;
  gaps: GappedTextGapItem[];
  options: GappedTextOption[];
}

export interface LetteredTextSection {
  id: string;
  letter: string;
  title: string;
  html: string;
}

export interface MatchingQuestionItem {
  id: string;
  number: number;
  question: string;
  correctLetter: string;
  explanation?: string;
}

export interface MultipleMatchingExercise extends BaseExercise {
  type: 'multiple-matching';
  texts: LetteredTextSection[];
  items: MatchingQuestionItem[];
}

export interface CrossTextMatchingExercise extends BaseExercise {
  type: 'cross-text-matching';
  texts: LetteredTextSection[];
  items: MatchingQuestionItem[];
}

export type Exercise =
  | MultipleChoiceClozeExercise
  | OpenClozeExercise
  | WordFormationExercise
  | KeyWordTransformationExercise
  | MultipleChoiceExercise
  | GappedTextExercise
  | MultipleMatchingExercise
  | CrossTextMatchingExercise;

export type ColorThemeId =
  | 'paper-light'
  | 'pure-white'
  | 'warm-cream'
  | 'soft-mint'
  | 'slate-dark'
  | 'high-contrast';

export type FontFamilyChoice = 'sans' | 'serif' | 'readable';

export interface AccessibilitySettings {
  theme: ColorThemeId;
  fontSize: number; // px: 14 to 28
  lineHeight: number; // 1.45 | 1.65 | 1.85
  fontFamily: FontFamilyChoice;
  splitRatio: number; // 35 to 65 (%) for left panel on desktop
}

export interface ThemePalette {
  id: ColorThemeId;
  name: string;
  description: string;
  isDark: boolean;
  bgCanvas: string;
  bgPanel: string;
  bgElevated: string;
  bgHeader: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderStrong: string;
  accentBg: string;
  accentText: string;
  accentFg: string;
  accentSoft: string;
  accentBorder: string;
  successFg: string;
  successBg: string;
  errorFg: string;
  errorBg: string;
  scrollThumb: string;
}

export const THEME_PALETTES: Record<ColorThemeId, ThemePalette> = {
  'paper-light': {
    id: 'paper-light',
    name: 'Paper Light',
    description: 'Clean off-white editorial surface with deep ink.',
    isDark: false,
    bgCanvas: '#F6F5F1',
    bgPanel: '#FFFFFF',
    bgElevated: '#EFECE4',
    bgHeader: '#FFFFFF',
    textPrimary: '#18181B',
    textSecondary: '#3F3F46',
    textMuted: '#686873',
    borderSubtle: '#E2DFD7',
    borderStrong: '#C8C4B8',
    accentBg: '#2E3A8C',
    accentText: '#FFFFFF',
    accentFg: '#2E3A8C',
    accentSoft: 'rgba(46, 58, 140, 0.10)',
    accentBorder: 'rgba(46, 58, 140, 0.35)',
    successFg: '#065F46',
    successBg: '#D1FAE5',
    errorFg: '#991B1B',
    errorBg: '#FEE2E2',
    scrollThumb: 'rgba(63, 63, 70, 0.28)',
  },
  'pure-white': {
    id: 'pure-white',
    name: 'Pure White',
    description: 'Maximum brightness white with crisp black type.',
    isDark: false,
    bgCanvas: '#F8FAFC',
    bgPanel: '#FFFFFF',
    bgElevated: '#F1F5F9',
    bgHeader: '#FFFFFF',
    textPrimary: '#09090B',
    textSecondary: '#27272A',
    textMuted: '#52525B',
    borderSubtle: '#E2E8F0',
    borderStrong: '#CBD5E1',
    accentBg: '#1D4ED8',
    accentText: '#FFFFFF',
    accentFg: '#1D4ED8',
    accentSoft: 'rgba(29, 78, 216, 0.09)',
    accentBorder: 'rgba(29, 78, 216, 0.35)',
    successFg: '#047857',
    successBg: '#ECFDF5',
    errorFg: '#B91C1C',
    errorBg: '#FEF2F2',
    scrollThumb: 'rgba(39, 39, 42, 0.28)',
  },
  'warm-cream': {
    id: 'warm-cream',
    name: 'Warm Cream',
    description: 'Low-glare sepia tint to ease visual fatigue.',
    isDark: false,
    bgCanvas: '#EFE7D8',
    bgPanel: '#F7F1E5',
    bgElevated: '#EAE0CE',
    bgHeader: '#F7F1E5',
    textPrimary: '#231B14',
    textSecondary: '#43362B',
    textMuted: '#6B5A4B',
    borderSubtle: '#DDD1BC',
    borderStrong: '#C5B49A',
    accentBg: '#854D0E',
    accentText: '#FFFBEB',
    accentFg: '#854D0E',
    accentSoft: 'rgba(133, 77, 14, 0.12)',
    accentBorder: 'rgba(133, 77, 14, 0.36)',
    successFg: '#166534',
    successBg: '#DCFCE7',
    errorFg: '#991B1B',
    errorBg: '#FEE2E2',
    scrollThumb: 'rgba(67, 54, 43, 0.28)',
  },
  'soft-mint': {
    id: 'soft-mint',
    name: 'Soft Mint',
    description: 'Calming pale sage surface for dyslexia & glare sensitivity.',
    isDark: false,
    bgCanvas: '#E3EFE8',
    bgPanel: '#EFF7F2',
    bgElevated: '#DCEADF',
    bgHeader: '#EFF7F2',
    textPrimary: '#10241A',
    textSecondary: '#224132',
    textMuted: '#466858',
    borderSubtle: '#C8DDD0',
    borderStrong: '#A7C7B4',
    accentBg: '#065F46',
    accentText: '#FFFFFF',
    accentFg: '#065F46',
    accentSoft: 'rgba(6, 95, 70, 0.11)',
    accentBorder: 'rgba(6, 95, 70, 0.35)',
    successFg: '#065F46',
    successBg: '#D1FAE5',
    errorFg: '#991B1B',
    errorBg: '#FEE2E2',
    scrollThumb: 'rgba(34, 65, 50, 0.28)',
  },
  'slate-dark': {
    id: 'slate-dark',
    name: 'Slate Dark',
    description: 'Deep slate background with soft high-legibility light ink.',
    isDark: true,
    bgCanvas: '#0B1120',
    bgPanel: '#111827',
    bgElevated: '#1E293B',
    bgHeader: '#0F172A',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    borderSubtle: '#1E293B',
    borderStrong: '#334155',
    accentBg: '#38BDF8',
    accentText: '#082F49',
    accentFg: '#7DD3FC',
    accentSoft: 'rgba(56, 189, 248, 0.15)',
    accentBorder: 'rgba(56, 189, 248, 0.42)',
    successFg: '#6EE7B7',
    successBg: 'rgba(16, 185, 129, 0.18)',
    errorFg: '#FCA5A5',
    errorBg: 'rgba(239, 68, 68, 0.18)',
    scrollThumb: 'rgba(148, 163, 184, 0.35)',
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Pure black and yellow/white for projectors and low vision.',
    isDark: true,
    bgCanvas: '#000000',
    bgPanel: '#050505',
    bgElevated: '#141414',
    bgHeader: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#FEF08A',
    textMuted: '#D4D4D8',
    borderSubtle: '#3F3F46',
    borderStrong: '#FACC15',
    accentBg: '#FACC15',
    accentText: '#000000',
    accentFg: '#FACC15',
    accentSoft: 'rgba(250, 204, 21, 0.20)',
    accentBorder: '#FACC15',
    successFg: '#4ADE80',
    successBg: 'rgba(34, 197, 94, 0.22)',
    errorFg: '#FB7185',
    errorBg: 'rgba(244, 63, 94, 0.22)',
    scrollThumb: 'rgba(250, 204, 21, 0.55)',
  },
};
