import { describe, it, expect, beforeEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { lessons, railLesson, words } from "../data/course";
import { normalize, isCorrect, makeExercises, type Mode } from "./exercises";
import {
  fresh,
  recordAnswer,
  reviewWord,
  validateProgress,
  saveProgress,
  readProgress,
  streak,
  dayKey,
} from "./store";
const modes: Mode[] = [
  "mixed",
  "translate",
  "choice",
  "build",
  "grammar",
  "listen",
  "dictation",
  "dialogue",
  "speech",
];
describe("Учебный контент и проверка ответов", () => {
  it("содержит отдельные настоящие уроки A0–A1 и железнодорожный вводный урок", () => {
    expect(lessons.filter((l) => l.level === "A0")).toHaveLength(6);
    expect(lessons.filter((l) => l.level === "A1")).toHaveLength(10);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(16);
    for (const l of [...lessons, railLesson]) {
      expect(l.rule.length).toBeGreaterThan(100);
      expect(l.tip.length).toBeGreaterThan(30);
      expect(l.pairs.length).toBeGreaterThanOrEqual(5);
    }
  });
  it("принимает регистр, пунктуацию, пробелы и канонически эквивалентную диакритику", () => {
    expect(isCorrect("  BUNĂ   ZIUA ", "Bună ziua!")).toBe(true);
    expect(isCorrect("Mulțumesc!".normalize("NFD"), "Mulțumesc.")).toBe(true);
    expect(normalize(" Nu. ")).toBe("nu");
  });
  it("различает диакритику, отрицание и порядок слов", () => {
    expect(isCorrect("Buna", "Bună")).toBe(false);
    expect(isCorrect("Mulţumesc", "Mulțumesc")).toBe(false);
    expect(isCorrect("Am bani", "Nu am bani")).toBe(false);
    expect(isCorrect("carte o am", "Am o carte")).toBe(false);
  });
  for (const mode of modes)
    it(`генерирует разрешимые упражнения ${mode}`, () => {
      for (const l of [...lessons, railLesson]) {
        const exercises = makeExercises(l, mode);
        expect(exercises.length).toBeGreaterThan(0);
        expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
        for (const e of exercises) {
          expect(e.answer).toBeTruthy();
          expect(isCorrect(e.answer, e.answer)).toBe(true);
          if (e.kind === "choice") {
            expect(e.options).toContain(e.answer);
            expect(new Set(e.options).size).toBe(e.options!.length);
          }
          if (e.kind === "listen" || e.kind === "speech")
            expect(e.audio).toBeTruthy();
        }
      }
    });
  it("в переводе действительно меняет направление", () => {
    const e = makeExercises(lessons[0], "translate");
    expect(e[0].answer).toBe("Bună!");
    expect(e[1].answer).toBe("Добрый день!");
  });
  it("словарные формы, примеры и изображения согласованы", () => {
    expect(words.length).toBe(26);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    for (const w of words) {
      expect(w.forms).toBeTruthy();
      expect(w.examples).toHaveLength(2);
      expect(w.examples[0].ro).toBeTruthy();
      if (w.image) expect(w.image).toMatch(/^\/photos\/\w+\.jpg$/);
    }
  });
});
describe("Реальный прогресс и SRS", () => {
  beforeEach(() => vi.useRealTimers());
  it("новый профиль не содержит нарисованных достижений", () => {
    const p = fresh();
    expect(p.xp).toBe(0);
    expect(p.attempts).toBe(0);
    expect(p.completed).toHaveLength(0);
    expect(streak(p)).toBe(0);
  });
  it("учитывает правильный ответ и не мутирует исходный профиль", () => {
    const p = fresh();
    const e = makeExercises(lessons[0])[0];
    const n = recordAnswer(p, e, true);
    expect(n.xp).toBe(10);
    expect(n.correct).toBe(1);
    expect(n.skills.reading).toEqual({ correct: 1, total: 1 });
    expect(n.activity[dayKey()]).toBe(1);
    expect(p.xp).toBe(0);
  });
  it("сохраняет ошибку и удаляет её после успешного повторения", () => {
    const e = makeExercises(lessons[0])[1];
    const failed = recordAnswer(fresh(), e, false);
    expect(failed.mistakes[e.id]).toEqual(e);
    expect(failed.xp).toBe(0);
    const fixed = recordAnswer(failed, e, true);
    expect(fixed.mistakes[e.id]).toBeUndefined();
    expect(fixed.attempts).toBe(2);
    expect(fixed.correct).toBe(1);
  });
  it("SRS назначает 1, 2, 4 дня, сбрасывает серию при ошибке", () => {
    let p = fresh();
    const now = 1000000;
    for (const [i, days] of [1, 2, 4].entries()) {
      p = reviewWord(p, "w0", true, now);
      expect(p.reviews.w0.interval).toBe(days);
      expect(p.reviews.w0.reps).toBe(i + 1);
      expect(p.reviews.w0.due).toBe(now + days * 86400000);
    }
    p = reviewWord(p, "w0", false, now);
    expect(p.reviews.w0.reps).toBe(0);
    expect(p.reviews.w0.due).toBe(now + 600000);
    expect(p.xp).toBe(15);
  });
  it("считает серию по локальным календарным дням, допускает вчерашнее занятие", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T12:00:00"));
    const p = fresh();
    p.activity = { "2026-10-16": 2, "2026-10-15": 3 };
    expect(streak(p)).toBe(2);
    p.activity["2026-10-17"] = 1;
    expect(streak(p)).toBe(3);
    p.activity = { "2026-10-14": 1 };
    expect(streak(p)).toBe(0);
    vi.useRealTimers();
  });
  it("восстанавливает полный профиль через JSON и IndexedDB", async () => {
    const p = recordAnswer(fresh(), makeExercises(lessons[0])[0], false);
    p.favorites = ["w0"];
    p.completed = ["a0-1"];
    p.intensive = [0];
    p.lessonActivity[dayKey()] = 1;
    p.reviews.w0 = { reps: 3, interval: 4, due: Date.now() + 86400000 };
    await saveProgress(p);
    expect(await readProgress()).toEqual(p);
    expect(validateProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it("отклоняет неподдерживаемые и повреждённые импорты", () => {
    for (const data of [
      null,
      {},
      { ...fresh(), version: 2 },
      { ...fresh(), xp: -1 },
      { ...fresh(), correct: 5 },
      { ...fresh(), speed: 99 },
      { ...fresh(), completed: "oops" },
      { ...fresh(), skills: {} },
      { ...fresh(), reviews: { w0: { due: "bad" } } },
      { ...fresh(), mistakes: { x: { answer: "bad" } } },
      { ...fresh(), intensive: [-1] },
      { ...fresh(), examResults: { A0: 150 } },
    ])
      expect(() => validateProgress(data)).toThrow();
  });
});
