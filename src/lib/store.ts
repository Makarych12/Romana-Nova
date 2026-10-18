import { openDB } from "idb";
import type { Exercise } from "./exercises";
export type Progress = {
  version: 1;
  xp: number;
  completed: string[];
  lessonActivity: Record<string, number>;
  activity: Record<string, number>;
  favorites: string[];
  reviews: Record<string, { due: number; interval: number; reps: number }>;
  mistakes: Record<string, Exercise>;
  skills: Record<Exercise["skill"], { correct: number; total: number }>;
  attempts: number;
  correct: number;
  plan: number;
  effects: boolean;
  speed: number;
  intensive: number[];
  examResults: Record<string, number>;
  dialoguePractice:Record<string,{at:string;choices:number[]}>;
};
export const fresh = (): Progress => ({
  version: 1,
  xp: 0,
  completed: [],
  lessonActivity: {},
  activity: {},
  favorites: [],
  reviews: {},
  mistakes: {},
  skills: {
    reading: { correct: 0, total: 0 },
    writing: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
    speaking: { correct: 0, total: 0 },
  },
  attempts: 0,
  correct: 0,
  plan: 30,
  effects: true,
  speed: 1,
  intensive: [],
  examResults: {},
  dialoguePractice:{},
});
const db = () =>
  openDB("romana-nova", 1, {
    upgrade(db) {
      db.createObjectStore("profile");
    },
  });
export async function readProgress() {
  const value = await (await db()).get("profile", "progress");
  return value ? validateProgress(value) : fresh();
}
export async function saveProgress(p: Progress) {
  await (await db()).put("profile", p, "progress");
}
export function validateProgress(v: unknown): Progress {
  if (!v || typeof v !== "object") throw Error("Неверный формат файла.");
  const p = structuredClone(v) as Progress;
  if (p.version === 1 && p.lessonActivity === undefined) p.lessonActivity = {};
  if (p.version===1&&p.dialoguePractice===undefined)p.dialoguePractice={};
  const array = (x: unknown) =>
    Array.isArray(x) && x.every((y) => typeof y === "string");
  const count = (x: unknown) =>
    typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 100000000;
  if (
    p.version !== 1 ||
    !count(p.xp) ||
    !count(p.attempts) ||
    !count(p.correct) ||
    p.correct > p.attempts ||
    !array(p.completed) ||
    !array(p.favorites) ||
    ![15, 30, 60, 90].includes(p.plan) ||
    typeof p.effects !== "boolean" ||
    ![0.75, 1, 1.25].includes(p.speed) ||
    !Array.isArray(p.intensive) ||
    !p.intensive.every((x) => Number.isInteger(x) && x >= 0 && x < 30)
  )
    throw Error("Файл прогресса повреждён или имеет неподдерживаемую версию.");
  for (const key of [
    "activity",
    "lessonActivity",
    "reviews",
    "mistakes",
    "skills",
    "examResults",
    "dialoguePractice",
  ] as const)
    if (!p[key] || typeof p[key] !== "object" || Array.isArray(p[key]))
      throw Error("Неполный файл прогресса.");
  for (const [day, x] of Object.entries({ ...p.activity, ...p.lessonActivity }))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !count(x))
      throw Error("Неверная история занятий.");
  for (const v of Object.values(p.skills))
    if (!v || !count(v.correct) || !count(v.total) || v.correct > v.total)
      throw Error("Неверная статистика навыков.");
  for (const s of ["reading", "writing", "listening", "speaking"])
    if (!(s in p.skills)) throw Error("Отсутствует статистика навыка.");
  for (const v of Object.values(p.reviews))
    if (
      !v ||
      !count(v.interval) ||
      !count(v.reps) ||
      typeof v.due !== "number" ||
      !Number.isFinite(v.due) ||
      v.due < 0
    )
      throw Error("Неверные данные повторения.");
  for(const d of Object.values(p.dialoguePractice))if(!d||typeof d.at!=="string"||!Number.isFinite(Date.parse(d.at))||!Array.isArray(d.choices)||!d.choices.every(x=>Number.isInteger(x)&&x>=0&&x<=20))throw Error("Неверные данные разговорной практики.");
  for (const v of Object.values(p.examResults))
    if (!count(v) || v > 100) throw Error("Неверные результаты экзамена.");
  for (const e of Object.values(p.mistakes))
    if (
      !e ||
      typeof e.id !== "string" ||
      typeof e.prompt !== "string" ||
      typeof e.answer !== "string" ||
      typeof e.why !== "string" ||
      !["choice", "input", "build", "listen", "speech"].includes(e.kind) ||
      !["reading", "writing", "listening", "speaking"].includes(e.skill) ||
      (e.options !== undefined && !array(e.options)) ||
      (e.wordId !== undefined && typeof e.wordId !== "string") ||
      (e.image !== undefined && typeof e.image !== "string") ||
      (e.imageSource!==undefined&&(!e.imageSource||typeof e.imageSource.url!=="string"||typeof e.imageSource.attribution!=="string"||typeof e.imageSource.licenseUrl!=="string"||typeof e.imageSource.license!=="string")) ||
      (e.characterBuild !== undefined && typeof e.characterBuild !== "boolean")
    )
      throw Error("Неверные данные упражнений.");
  return structuredClone(p);
}
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function streak(p: Progress) {
  let n = 0;
  const d = new Date();
  if (!p.activity[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (p.activity[dayKey(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
export function recordAnswer(p: Progress, e: Exercise, ok: boolean): Progress {
  const next = structuredClone(p);
  if (e.wordId) {
    const old = next.reviews[e.wordId];
    const interval = ok
      ? old
        ? Math.min(Math.max(old.interval * 2, 1), 60)
        : 1
      : 0;
    next.reviews[e.wordId] = {
      due: Date.now() + (ok ? interval * 86400000 : 600000),
      interval,
      reps: ok ? (old?.reps || 0) + 1 : 0,
    };
  }
  next.attempts++;
  if (ok) {
    next.correct++;
    next.xp += 10;
    delete next.mistakes[e.id];
  } else next.mistakes[e.id] = e;
  next.activity[dayKey()] = (next.activity[dayKey()] || 0) + 1;
  next.skills[e.skill].total++;
  if (ok) next.skills[e.skill].correct++;
  return next;
}
export function reviewWord(
  p: Progress,
  id: string,
  known: boolean,
  now = Date.now(),
): Progress {
  const next = structuredClone(p);
  const old = next.reviews[id];
  const interval = known
    ? old
      ? Math.min(Math.max(old.interval * 2, 1), 60)
      : 1
    : 0;
  next.reviews[id] = {
    due: now + (known ? interval * 86400000 : 600000),
    interval,
    reps: known ? (old?.reps || 0) + 1 : 0,
  };
  next.activity[dayKey()] = (next.activity[dayKey()] || 0) + 1;
  if (known) next.xp += 5;
  return next;
}
