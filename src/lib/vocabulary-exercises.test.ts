import { describe, it, expect } from "vitest";
import { words } from "../data/course";
import { cardModes, vocabularyExercises } from "./vocabulary-exercises";
import { fresh, recordAnswer, validateProgress } from "./store";
import { isCorrect } from "./exercises";
describe("Карточки и совместимость прогресса", () => {
  for (const mode of cardModes)
    it(`режим ${mode.title} имеет проверяемый ответ и стабильную привязку SRS`, () => {
      const exercises = vocabularyExercises(words, mode.id);
      expect(exercises.length).toBeGreaterThan(0);
      for (const e of exercises) {
        expect(e.wordId).toBeTruthy();
        expect(isCorrect(e.answer, e.answer)).toBe(true);
        if (e.kind === "choice") {
          expect(e.options).toContain(e.answer);
          expect(new Set(e.options).size).toBe(e.options!.length);
        }
        if (mode.id === "spelling") expect(e.characterBuild).toBe(true);
        if (mode.id === "photo") expect(e.image).toBeTruthy();
        if (mode.id === "audio") expect(e.audio).toBeTruthy();
      }
    });
  it("ответ карточки обновляет SRS, реальные навыки и ошибки без двойных XP", () => {
    const e = vocabularyExercises(words, "memory", 1)[0];
    const wrong = recordAnswer(fresh(), e, false);
    expect(wrong.reviews[e.wordId!].reps).toBe(0);
    expect(wrong.xp).toBe(0);
    const correct = recordAnswer(wrong, e, true);
    expect(correct.reviews[e.wordId!].reps).toBe(1);
    expect(correct.xp).toBe(10);
    expect(correct.skills.writing.total).toBe(2);
    expect(correct.mistakes[e.id]).toBeUndefined();
  });
  it("оригинальные 26 идентификаторов неизменны", () => {
    expect(words.map((w) => w.id)).toEqual(
      Array.from({ length: 26 }, (_, i) => "w" + i),
    );
    expect(words[0].ro).toBe("apă");
    expect(words[25].ro).toBe("a citi");
  });
  it("мигрирует ранний профиль без сброса избранного, слов и XP", () => {
    const old = fresh();
    old.xp = 500;
    old.completed = ["a0-1"];
    old.favorites = ["w0"];
    old.reviews.w0 = { due: 123, interval: 2, reps: 2 };
    delete (old as Partial<typeof old>).lessonActivity;
    delete (old as Partial<typeof old>).dialoguePractice;
    const migrated = validateProgress(old);
    expect(migrated.xp).toBe(500);
    expect(migrated.favorites).toEqual(["w0"]);
    expect(migrated.reviews.w0).toEqual({ due: 123, interval: 2, reps: 2 });
    expect(migrated.lessonActivity).toEqual({});
    expect(migrated.dialoguePractice).toEqual({});
  });
});

it('обновляет старый перевод в сохранённой ошибке и сохраняет ID истории',async()=>{
 const {refreshVocabularyMistakes}=await import('./vocabulary-exercises');
 const before={...words[0],ru:'старый неверный перевод'};
 const saved=vocabularyExercises([before,...words.slice(1,4)],'ro-ru',4).find(e=>e.wordId===before.id)!;
 const refreshed=refreshVocabularyMistakes([saved],words)[0];
 expect(refreshed.id).toBe(saved.id);expect(refreshed.wordId).toBe(before.id);expect(refreshed.answer).toBe('вода');expect(refreshed.options).toContain('вода');expect(refreshed.options).not.toContain('старый неверный перевод');
});

it('word-to-photo answers keep every picture tied to its selectable Romanian word and survive export',()=>{
 const tasks=vocabularyExercises(words,'photo-choice',5);
 for(const task of tasks){expect(task.image).toBeUndefined();expect(task.optionPhotos!.length).toBe(task.options!.length);for(const value of task.options!){const photo=task.optionPhotos!.find(p=>p.value===value)!;expect(photo.image).toBe(words.find(w=>w.ro===value)!.image);expect(photo.alt).toBe(words.find(w=>w.ro===value)!.ru);}expect(validateProgress(JSON.parse(JSON.stringify(recordAnswer(fresh(),task,false)))).mistakes[task.id].optionPhotos).toEqual(task.optionPhotos);}
});
