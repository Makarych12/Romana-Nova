import type { Lesson,Source } from "../data/course";
export type Mode =
  | "mixed"
  | "translate"
  | "choice"
  | "build"
  | "grammar"
  | "listen"
  | "dictation"
  | "dialogue"
  | "speech";
export type Exercise = {
  id: string;
  kind: "choice" | "input" | "build" | "listen" | "speech";
  prompt: string;
  answer: string;
  options?: string[];
  audio?: string;
  image?: string;
  imageSource?:Source;
  wordId?: string;
  characterBuild?: boolean;
  why: string;
  skill: "reading" | "writing" | "listening" | "speaking";
};
export function normalize(s: string) {
  return s
    .normalize("NFC")
    .toLocaleLowerCase("ro")
    .replace(/[.,!?;:„”"…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export const isCorrect = (input: string, answer: string) =>
  normalize(input) === normalize(answer);
export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
export function makeExercises(
  lesson: Lesson,
  mode: Mode = "mixed",
): Exercise[] {
  const result = lesson.pairs.map((p, i): Exercise => {
    const kind =
      mode === "mixed"
        ? (["choice", "input", "build", "listen", "input"] as const)[i % 5]
        : mode === "choice" || mode === "dialogue"
          ? "choice"
          : mode === "build"
            ? "build"
            : mode === "listen" || mode === "dictation"
              ? "listen"
              : mode === "speech"
                ? "speech"
                : "input";
    const reverse = mode === "translate" && i % 2 === 1;
    const answer = reverse ? p.ru : p.ro;
    return {
      id: `${lesson.id}:${mode}:${i}`,
      kind,
      prompt:
        kind === "listen"
          ? "Послушайте и запишите по-румынски"
          : kind === "speech"
            ? "Произнесите фразу по-румынски"
            : mode === "dialogue"
              ? `Вы в разговоре. Как сказать: «${p.ru}»?`
              : reverse
                ? `Переведите на русский: ${p.ro}`
                : `Переведите на румынский: ${p.ru}`,
      answer,
      options:
        kind === "choice"
          ? shuffle([
              p.ro,
              ...lesson.pairs
                .filter((x) => x.ro !== p.ro)
                .slice(0, 3)
                .map((x) => x.ro),
            ])
          : undefined,
      audio: kind === "listen" || kind === "speech" ? p.ro : undefined,
      why: `${p.ro} — ${p.ru}${p.note ? " · " + p.note : ""}`,
      skill:
        kind === "listen"
          ? "listening"
          : kind === "speech"
            ? "speaking"
            : kind === "choice"
              ? "reading"
              : "writing",
    };
  });
  if ((mode === "mixed" || mode === "grammar") && lesson.form) {
    const f = lesson.form;
    const ex: Exercise = {
      id: `${lesson.id}:form`,
      kind: "input",
      prompt: f.prompt,
      answer: f.answer,
      why: f.why,
      skill: "writing",
    };
    if (mode === "grammar") return [ex, ...result.slice(0, 3)];
    result.push(ex);
  }
  return result;
}
