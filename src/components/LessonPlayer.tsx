import { useEffect, useMemo, useState, useRef } from "react";
import {
  X,
  Volume2,
  ArrowRight,
  Check,
  RotateCcw,
  Mic,
  BookOpen,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import type { Lesson } from "../data/course";
import {
  makeExercises,
  isCorrect,
  shuffle,
  type Exercise,
  type Mode,
} from "../lib/exercises";
import { AudioBar } from "./AudioControls";
import SafeImage from "./SafeImage";
import { speak, stopAudio } from "../lib/audio";
type Props = {
  lesson: Lesson;
  mode: Mode;
  custom?: Exercise[];
  exam?: boolean;
  speed: number;
  onClose: () => void;
  onAnswer: (e: Exercise, ok: boolean) => void;
  onComplete: (score: number) => void;
  notify: (s: string) => void;
};
export default function LessonPlayer({
  lesson,
  mode,
  custom,
  exam,
  speed,
  onClose,
  onAnswer,
  onComplete,
  notify,
}: Props) {
  const exercises = useMemo(
    () => custom || makeExercises(lesson, mode),
    [lesson, mode, custom],
  );
  const [stage, setStage] = useState<"learn" | "practice" | "result">(
    exam || custom ? "practice" : "learn",
  );
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [listening, setListening] = useState(false);
  const e = exercises[index];
  const tokens = useMemo(
    () =>
      e
        ? shuffle(
            (e.characterBuild ? Array.from(e.answer) : e.answer.split(" ")).map(
              (word, id) => ({ word, id }),
            ),
          )
        : [],
    [e],
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const recognizeRef = useRef<{ stop: () => void } | null>(null);
  const scorePercent = Math.round((score / exercises.length) * 100);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      previous?.focus();
      recognizeRef.current?.stop();
      stopAudio();
    };
  }, []);
  function check() {
    if (!value.trim() || checked !== null) return;
    const ok = isCorrect(value, e.answer);
    setChecked(ok);
    if (ok) setScore((x) => x + 1);
    onAnswer(e, ok);
  }
  function next() {
    stopAudio();
    if (index === exercises.length - 1) {
      onComplete(scorePercent);
      setStage("result");
    } else {
      setIndex((x) => x + 1);
      setValue("");
      setSelected([]);
      setChecked(null);
    }
  }
  function recognize() {
    const host = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition;
    if (!Ctor) {
      notify(
        "Распознавание речи недоступно. Попробуйте Chrome с разрешённым доступом к микрофону.",
      );
      return;
    }
    const recognition = new Ctor();
    recognizeRef.current = recognition;
    recognition.lang = "ro-RO";
    recognition.onresult = (event) => {
      setValue(event.results[0][0].transcript);
      setListening(false);
    };
    recognition.onerror = () => {
      setListening(false);
      notify(
        "Не удалось распознать речь. Проверьте микрофон и подключение к интернету.",
      );
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }
  return (
    <div
      className="modal-backdrop"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="lesson-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-title"
        onKeyDown={(ev) => {
          if (ev.key === "Escape") onClose();
          if (ev.key === "Tab") {
            const items = Array.from(
              modalRef.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,[tabindex="0"]',
              ),
            );
            const first = items[0],
              last = items.at(-1);
            if (ev.shiftKey && document.activeElement === first) {
              ev.preventDefault();
              last?.focus();
            } else if (!ev.shiftKey && document.activeElement === last) {
              ev.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="modal-head">
          <span className="eyebrow">
            {exam ? "Проверка знаний" : `${lesson.level} · ${lesson.subtitle}`}
          </span>
          <button
            ref={closeRef}
            className="icon-btn"
            aria-label="Закрыть урок"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        <h2 id="lesson-title">{lesson.title}</h2>
        <AudioBar notify={notify} inline />
        {stage === "learn" ? (
          <>
            <div className="lesson-rule">
              <BookOpen size={22} />
              <p>{lesson.rule}</p>
            </div>
            {lesson.table && (
              <div className="grammar-table">
                <table>
                  <thead>
                    <tr>
                      {lesson.table.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lesson.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} lang={j === 0 ? "ru" : "ro"}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h3>Посмотрите, послушайте, запомните</h3>
            <div className="example-list">
              {lesson.pairs.map((p) => (
                <div key={p.ro}>
                  <div>
                    <strong lang="ro">{p.ro}</strong>
                    <span>{p.ru}</span>
                    {p.note && <small>{p.note}</small>}
                  </div>
                  <button
                    className="icon-btn"
                    aria-label={`Послушать ${p.ro}`}
                    onClick={() => speak(p.ro, speed, notify)}
                  >
                    <Volume2 size={19} />
                  </button>
                </div>
              ))}
            </div>
            <div className="tip">
              <span>ОБРАТИТЕ ВНИМАНИЕ</span>
              <p>{lesson.tip}</p>
            </div>
            <button
              className="primary full"
              onClick={() => setStage("practice")}
            >
              Перейти к практике <ArrowRight size={18} />
            </button>
          </>
        ) : stage === "result" ? (
          <div className="result">
            <div className="result-icon">
              <Trophy size={44} />
            </div>
            <span className="eyebrow">Практика завершена</span>
            <h3>
              {scorePercent >= 80
                ? "Отличная работа!"
                : "Продолжайте, всё получится"}
            </h3>
            <div className="result-number">{scorePercent}%</div>
            <p>
              Правильных ответов: {score} из {exercises.length}.
            </p>
            <p>
              {scorePercent >= 80
                ? "Результат сохранён. Вы сделали ещё один шаг."
                : "Ошибки сохранены в разделе «Практика». Для прохождения урока нужно не менее 80%."}
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => {
                  setIndex(0);
                  setValue("");
                  setSelected([]);
                  setScore(0);
                  setChecked(null);
                  setStage("learn");
                }}
              >
                <RotateCcw size={17} /> Повторить
              </button>
              <button className="primary" onClick={onClose}>
                Готово <Check size={18} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="exercise-progress">
              <span>
                Задание {index + 1} из {exercises.length}
              </span>
              <span>{Math.round((index / exercises.length) * 100)}%</span>
            </div>
            <div className="progress-bar">
              <i style={{ width: `${(index / exercises.length) * 100}%` }} />
            </div>
            <div className="question">
              <span className="eyebrow">
                {e.kind === "build"
                  ? "Соберите предложение"
                  : e.kind === "listen"
                    ? "Аудирование"
                    : e.kind === "speech"
                      ? "Разговорная практика"
                      : "Ваша очередь"}
              </span>
              <h3>{e.prompt}</h3>
              {e.image && (
                <SafeImage
                  src={e.image}
                  alt="Предмет для задания"
                  className="exercise-photo"
                />
              )}{e.imageSource&&<p className="exercise-photo-credit"><a href={e.imageSource.url} target="_blank" rel="noreferrer">Фото: {e.imageSource.attribution}</a> · <a href={e.imageSource.licenseUrl} target="_blank" rel="noreferrer">{e.imageSource.license}</a></p>}
              {e.audio && (
                <button
                  className="audio-pill"
                  onClick={() => speak(e.audio!, speed, notify)}
                >
                  <Volume2 size={22} /> Послушать · {speed}×
                </button>
              )}
              {e.kind === "speech" && (
                <>
                  <p lang="ro" className="speech-phrase">
                    {e.answer}
                  </p>
                  <button
                    className="secondary"
                    disabled={checked !== null || listening}
                    onClick={recognize}
                  >
                    <Mic size={19} />
                    {listening ? "Слушаю…" : "Произнести фразу"}
                  </button>
                  <small className="muted block">
                    Сравниваем распознанный текст. Это не оценка качества
                    произношения. Распознавание может требовать интернет.
                  </small>
                </>
              )}
            </div>
            {e.kind === "choice" ? (
              <div className="answers">
                {e.options?.map((option, i) => (
                  <button
                    className={`${value === option ? "selected" : ""} ${checked !== null && option === e.answer ? "correct" : ""}`}
                    disabled={checked !== null}
                    key={option}
                    onClick={() => setValue(option)}
                  >
                    <span>{i + 1}</span>
                    {option}
                    {value === option && <Check size={19} />}
                  </button>
                ))}
              </div>
            ) : e.kind === "build" ? (
              <>
                <div className="sentence-box" aria-live="polite">
                  {selected.length ? (
                    selected.map((id) => (
                      <button
                        disabled={checked !== null}
                        key={id}
                        onClick={() => {
                          const ids = selected.filter((x) => x !== id);
                          setSelected(ids);
                          setValue(
                            ids
                              .map((j) => tokens[j].word)
                              .join(e.characterBuild ? "" : " "),
                          );
                        }}
                      >
                        {tokens[id].word === " " ? "␣" : tokens[id].word}
                        <X size={12} />
                      </button>
                    ))
                  ) : (
                    <span>Нажимайте на слова в правильном порядке</span>
                  )}
                </div>
                <div className="word-tokens">
                  {tokens.map((token, i) => (
                    <button
                      key={token.id}
                      disabled={selected.includes(i) || checked !== null}
                      onClick={() => {
                        const ids = [...selected, i];
                        setSelected(ids);
                        setValue(
                          ids
                            .map((j) => tokens[j].word)
                            .join(e.characterBuild ? "" : " "),
                        );
                      }}
                    >
                      {token.word === " " ? "␣" : token.word}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <input
                  autoComplete="off"
                  spellCheck={false}
                  readOnly={e.kind === "speech"}
                  aria-label="Ваш ответ"
                  className="answer-input"
                  placeholder={
                    e.kind === "speech"
                      ? "Распознанная фраза появится здесь"
                      : "Введите ответ…"
                  }
                  value={value}
                  disabled={checked !== null}
                  onChange={(ev) => setValue(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") checked === null ? check() : next();
                  }}
                />
                <div className="diacritics">
                  {"ăâîșț".split("").map((c) => (
                    <button
                      disabled={checked !== null || e.kind === "speech"}
                      key={c}
                      onClick={() => setValue((v) => v + c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            {checked !== null && (
              <div
                className={`feedback ${checked ? "success" : "failure"}`}
                role="status"
              >
                <strong>
                  {checked ? "Верно. Так держать!" : "Разберём вместе"}
                </strong>
                <p>{e.why}</p>
                {!checked && (
                  <small>
                    Правильный ответ: <b lang="ro">{e.answer}</b>. Вернитесь к
                    объяснению и повторите это задание.
                  </small>
                )}
              </div>
            )}
            <button
              className="primary full"
              disabled={checked === null && !value.trim()}
              onClick={checked === null ? check : next}
            >
              {checked === null
                ? "Проверить"
                : index === exercises.length - 1
                  ? "Завершить"
                  : "Следующее задание"}
              <ArrowRight size={18} />
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
interface Recognition {
  lang: string;
  onresult: (event: {
    results: { [key: number]: { [key: number]: { transcript: string } } };
  }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
