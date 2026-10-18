import type { Word, Lesson } from "../data/course";
import { shuffle, type Exercise } from "./exercises";
export type CardMode =
  | "photo-choice"
  | "photo"
  | "audio"
  | "ro-ru"
  | "ru-ro"
  | "spelling"
  | "memory"
  | "example";
export const cardModes: { id: CardMode; title: string }[] = [
  { id: "photo-choice", title: "Румынское слово → фотография" },
  { id: "photo", title: "Фотография → румынское слово" },
  { id: "audio", title: "Аудио → слово" },
  { id: "ro-ru", title: "RO → RU" },
  { id: "ru-ro", title: "RU → RO" },
  { id: "spelling", title: "Сборка слова" },
  { id: "memory", title: "Написание по памяти" },
  {id:"example",title:"Пример → перевод"},
];
export function vocabularyExercises(
  words: Word[],
  mode: CardMode,
  limit = 10,
): Exercise[] {
  const pool = words.filter((w) => (!["photo","photo-choice"].includes(mode) || w.image)&&(mode!=="example"||w.examples.length>0));
  return shuffle(pool)
    .slice(0, limit)
    .map((w) => {
      const choice = ["photo-choice", "photo", "audio", "ro-ru", "ru-ro","example"].includes(mode);
      const example=mode==="example"?shuffle(w.examples)[0]:undefined;
      const answer = example?example.ru:mode === "ro-ru" ? w.ru : w.ro;
      const alternatives = shuffle([
        ...new Set(
          pool
            .filter((other) => other.id !== w.id)
            .map((other) => (mode==="example"?other.examples[0].ru:mode === "ro-ru" ? other.ru : other.ro)),
        ),
      ])
        .filter((x) => x !== answer)
        .slice(0, 3);
      return {
        id: `vocab:${mode}:${w.id}${example?":"+w.examples.indexOf(example):""}`,
        wordId: w.id,
        kind: choice ? "choice" : mode === "spelling" ? "build" : "input",
        optionPhotos:mode==='photo-choice'?[w,...pool.filter(other=>alternatives.includes(other.ro))].map(other=>({value:other.ro,image:other.image!,alt:other.ru,source:other.imageSource})):undefined,
        prompt:
          mode==="photo-choice"?`Выберите фотографию: ${w.ro}`:mode==="example"?`Выберите перевод предложения: ${example!.ro}`:mode === "photo"
            ? "Как называется предмет на фотографии?"
            : mode === "audio"
              ? "Послушайте и выберите румынское слово"
              : mode === "ro-ru"
                ? `Выберите перевод: ${w.ro}`
                : mode === "ru-ro"
                  ? `Выберите румынский вариант: ${w.ru}`
                  : mode === "spelling"
                    ? `Соберите по буквам: ${w.ru}`
                    : `Напишите по памяти: ${w.ru}`,
        answer,
        options: choice ? shuffle([answer, ...alternatives]) : undefined,
        audio:example?example.ro: mode === "audio" ? w.ro : undefined,
        image: mode === "photo" ? w.image : undefined,
        imageSource:mode==='photo'?w.imageSource:undefined,
        characterBuild: mode === "spelling",
        why: example?`${example.ro} — ${example.ru}`:`${w.ro} — ${w.ru}${w.examples[0] ? ` · ${w.examples[0].ro} — ${w.examples[0].ru}` : ""}`,
        skill: mode === "audio" ? "listening" : choice ? "reading" : "writing",
      };
    });
}
export function vocabularyLesson(words: Word[]): Lesson {
  const level = words[0]?.level || "A0";
  return {
    id: `vocabulary-${level}`,
    level,
    title: `Словарная практика ${level}`,
    subtitle: "Слова · карточки · интервальное повторение",
    minutes: 8,
    rule: "Практика слов из выбранного фильтра. Это лексическая тренировка; она не означает прохождения полного уровня CEFR.",
    tip: "Обратите внимание на диакритические знаки. Проверяйте контекст слова по примерам и источнику.",
    pairs: words.slice(0, 10).map((w) => ({ ro: w.ro, ru: w.ru })),
  };
}

// Refresh saved exercise snapshots after editorial corrections without changing history IDs.
export function refreshVocabularyMistakes(exercises:Exercise[],words:Word[]):Exercise[]{
 const byId=new Map(words.map(w=>[w.id,w]));
 return exercises.map(old=>{
  const mode=old.id.split(':')[1] as CardMode;
  if(!old.id.startsWith('vocab:')||!old.wordId||!cardModes.some(m=>m.id===mode))return old;
  const word=byId.get(old.wordId);if(!word)return old;
  const others=shuffle(words.filter(w=>w.id!==word.id&&(!['photo','photo-choice'].includes(mode)||w.image)&&(mode!=='example'||w.examples.length))).slice(0,3);
  const updated=vocabularyExercises([word,...others],mode,4).find(e=>e.wordId===word.id);
  return updated?{...updated,id:old.id}:old;
 });
}
