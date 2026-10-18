import { expect, it } from 'vitest';
import photoSizes from '../data/responsive-photos.json';
import { dictionaryPhoto } from './dictionary-photos';
import type { Word } from '../data/course';

it('keeps direct photos, resolves literal semantic contexts and preserves vocabulary data', () => {
  const makeWord = (ru: string): Word => ({ id: 'unchanged-id', ro: 'test', ru, level: 'A1', pos: 'сущ.', forms: '', theme: 'Общая лексика', examples: [] });
  const direct = { ...makeWord('кофе'), image: '/photos/coffee.jpg' };
  expect(dictionaryPhoto(direct)).toMatchObject({ src: direct.image, contextual: false });
  for (const [ru, label] of [['вероятность', 'Решение и выбор'], ['путешествовать', 'Путешествие'], ['если', 'Решение и выбор'], ['и', 'Изучение слова · чтение']]) {
    const word = makeWord(ru);
    const before = JSON.stringify(word);
    const photo = dictionaryPhoto(word);
    expect(photo).toMatchObject({ contextual: true, label });
    expect(photo.src in photoSizes).toBe(true);
    expect(photo.source?.licenseUrl).toMatch(/^https?:/);
    expect(JSON.stringify(word)).toBe(before);
  }
});
