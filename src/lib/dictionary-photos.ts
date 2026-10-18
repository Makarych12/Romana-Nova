import contexts from '../data/dictionary-photo-contexts.json';
import type { Word, Source } from '../data/course';

export type DictionaryPhoto = { src: string; label: string; contextual: boolean; source?: Source };
const rules = contexts.map(context => ({
  ...context,
  pattern: new RegExp(`(?:^|[^а-яё])(?:${context.terms})`, 'iu'),
}));
const reading = rules.find(context => context.label === 'Чтение и язык')!;

// Contexts are presentation-only: never overwrite Word.image or photo exercise answers.
export function dictionaryPhoto(word: Word): DictionaryPhoto {
  if (word.image) return { src: word.image, label: word.ru, contextual: false, source: word.imageSource };
  const context = rules.find(rule => rule.pattern.test(word.ru))
    ?? rules.find(rule => rule.themes.includes(word.theme));
  if (!context) return { src: reading.src, label: 'Изучение слова · чтение', contextual: true, source: reading.source ?? undefined };
  return { src: context.src, label: context.label, contextual: true, source: context.source ?? undefined };
}
