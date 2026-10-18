import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Search,
  Heart,
  Volume2,
  RotateCcw,
  Layers,
  Headphones,
  Languages,
  Blocks,
  PenLine,
  Mic,
  MessageSquare,
  TrainFront,
  Clock3,
  LockKeyhole,
  Download,
  Upload,
  Zap,
  Trophy,
  Flame,
  CalendarDays,
  Settings,
  GraduationCap,
  Target,
} from "lucide-react";
import { motion } from "motion/react";
import type { PageProps } from "../App";
import {
  lessons,
  levels,
  words,
  grammarTopics,
  railLesson,
  railSections,
  intensiveTopics,
  type Level,
} from "../data/course";
import { type Mode, makeExercises, shuffle } from "../lib/exercises";
import { dayKey, streak, validateProgress } from "../lib/store";
import { speak } from "../lib/audio";
import { dialogues, dialogueAudio } from "../data/dialogues";
import { catalogMeta,loadVocabulary } from "../lib/vocabulary";
import {refreshVocabularyMistakes} from "../lib/vocabulary-exercises";
import DialogueLibrary from "../components/DialogueLibrary";
import Dictionary from "../components/Dictionary";
import { AudioDiagnostics } from "../components/AudioControls";
export default function AcademyPages(props: PageProps) {
  const { page, progress: p, update, openLesson, notify } = props;
  const [level, setLevel] = useState<Level>("A0");
  const [mode, setMode] = useState<Mode>("mixed");
  const [practiceLesson, setPracticeLesson] = useState(lessons[0].id);
  const input = useRef<HTMLInputElement>(null);
  const lesson = lessons.find((l) => l.id === practiceLesson)!;
  const titles: Record<string, [string, string, string]> = {
    course: [
      "ВАШ УЧЕБНЫЙ МАРШРУТ",
      "Каждый уровень — новая свобода.",
      "Начните с нуля или откройте любой урок. Ваш темп — ваши правила.",
    ],
    practice: [
      "ОТ ЗНАНИЙ К НАВЫКУ",
      "Всё получается с практикой.",
      "Переводите, слушайте, собирайте фразы и учитесь на ошибках.",
    ],
    dictionary: [
      "ВАША КОЛЛЕКЦИЯ СЛОВ",
      "У каждого слова — свой мир.",
      "Учите слова в контексте. Слушайте и возвращайтесь к ним вовремя.",
    ],
    grammar: [
      "ПОНИМАТЬ, А НЕ ЗАУЧИВАТЬ",
      "Грамматика обретает смысл.",
      "Понятные объяснения на русском и практика на румынском.",
    ],
    rail: [
      "ЯЗЫК ВАШЕЙ ПРОФЕССИИ",
      "Следующая станция — уверенность.",
      "От первых технических терминов к профессиональному общению.",
    ],
    intensive: [
      "МАЛЕНЬКИЕ ШАГИ КАЖДЫЙ ДЕНЬ",
      "30 дней навстречу Румынии.",
      "Практический маршрут для жизни. Интенсив не заменяет программу CEFR.",
    ],
    progress: [
      "ВАШИ НАСТОЯЩИЕ ДОСТИЖЕНИЯ",
      "Каждый шаг имеет значение.",
      "Здесь только ваши действия: ответы, уроки и повторения.",
    ],
    settings: [
      "ВАШЕ ПРОСТРАНСТВО",
      "Всё в вашем ритме.",
      "Настройте обучение и сохраните копию своих результатов.",
    ],
  };
  const title = titles[page] || titles.course;
  return (
    <motion.div
      key={page}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-content"
    >
      <div className="page-heading">
        <span className="eyebrow">{title[0]}</span>
        <h1>{title[1]}</h1>
        <p>{title[2]}</p>
      </div>
      {page === "course" && (
        <>
          <div className="content-notice">
            <BookOpen size={20} />
            <p>
              <strong>
                Сейчас доступны A0 и A1: {lessons.length} уроков с практикой.
              </strong>{" "}
              A0 — вводная ступень, не официальный уровень CEFR. A2–C1 находятся
              в разработке. Прохождение уроков не равно сертификации уровня.
            </p>
          </div>
          <div className="vocabulary-level-links">
            <span>Словарная практика по уровням:</span>
            {levels.map((l) => (
              <a className="text-tag" key={l.id} href={`#dictionary/${l.id}`}>
                {l.id} · {catalogMeta.levels[l.id]} слов{" "}
                <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
          <div className="level-tabs">
            {levels.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={level === l.id ? "active" : ""}
              >
                <strong>{l.id}</strong>
                <span>{l.name}</span>
                {!["A0", "A1"].includes(l.id) && <LockKeyhole size={13} />}
              </button>
            ))}
          </div>
          <div className="section-head">
            <h2>
              {level} · {levels.find((l) => l.id === level)?.name}
            </h2>
            <span className="muted">
              {
                lessons.filter(
                  (l) => l.level === level && p.completed.includes(l.id),
                ).length
              }
              /{lessons.filter((l) => l.level === level).length} уроков
            </span>
          </div>
          {["A0", "A1"].includes(level) ? (
            <>
              <div className="lesson-grid">
                {lessons
                  .filter((l) => l.level === level)
                  .map((l, i) => (
                    <button
                      key={l.id}
                      className={`lesson-card ${p.completed.includes(l.id) ? "completed" : ""}`}
                      onClick={() => openLesson(l)}
                    >
                      <span className="lesson-number">
                        {p.completed.includes(l.id) ? (
                          <Check size={22} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <div>
                        <span className="eyebrow">УРОК {i + 1}</span>
                        <h3>{l.title}</h3>
                        <p>{l.subtitle}</p>
                        <span className="lesson-duration">
                          <Clock3 size={13} />
                          {l.minutes} минут · объяснение + практика
                        </span>
                      </div>
                      <ArrowUpRight size={19} />
                    </button>
                  ))}
              </div>
              <div className="exam-card">
                <GraduationCap size={32} />
                <div>
                  <h3>Итоговая проверка {level}</h3>
                  <p>
                    Смешанные задания по всем урокам уровня. Проходной результат
                    — 80%.
                  </p>
                  {p.examResults[level] !== undefined && (
                    <span className="cyan-text">
                      Последний результат: {p.examResults[level]}%
                    </span>
                  )}
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    const exercises = lessons
                      .filter((l) => l.level === level)
                      .flatMap((l) => makeExercises(l).slice(0, 3));
                    openLesson(
                      {
                        ...lessons.find((l) => l.level === level)!,
                        title: `Итоговая проверка ${level}`,
                      },
                      "mixed",
                      shuffle(exercises),
                      true,
                    );
                  }}
                >
                  Проверить себя <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <LockKeyhole size={35} />
              <h3>Этот этап ещё впереди</h3>
              <p>
                {levels.find((l) => l.id === level)?.description}. Полноценные
                уроки этого уровня находятся в разработке.
              </p>
              <button className="secondary" onClick={() => setLevel("A1")}>
                Перейти к доступным урокам <ArrowRight size={17} />
              </button>
            </div>
          )}
        </>
      )}
      {page === "practice" && (
        <>
          <div className="vocabulary-level-links">
            <span>Новые словарные тренировки:</span>
            {levels.map((l) => (
              <a className="text-tag" key={l.id} href={`#dictionary/${l.id}`}>
                {l.id} <ArrowUpRight size={12} />
              </a>
            ))}
          </div>
          <div className="practice-modes">
            {(
              [
                [Languages, "Перевод", "RU → RO и RO → RU", "translate"],
                [Check, "Выбор ответа", "Найдите верный вариант", "choice"],
                [Blocks, "Конструктор фраз", "Соберите предложение", "build"],
                [GraduationCap, "Грамматика", "Формы и спряжения", "grammar"],
                [Headphones, "Аудирование", "Слушайте и записывайте", "listen"],
                [PenLine, "Диктант", "От звука к написанию", "dictation"],
                [
                  MessageSquare,
                  "Реплики для разговора",
                  "Выберите нужную фразу",
                  "dialogue",
                ],
                [
                  Mic,
                  "Голосовая практика",
                  "Произнесите и сравните текст",
                  "speech",
                ],
              ] as const
            ).map(([Icon, t, d, m]) => (
              <button
                className={`mode-card ${mode === m ? "selected" : ""}`}
                onClick={() => {
                  setMode(m);
                  if (
                    m === "grammar" &&
                    !lessons.find((l) => l.id === practiceLesson)?.form
                  )
                    setPracticeLesson("a1-1");
                }}
                key={m}
              >
                <Icon size={24} />
                <strong>{t}</strong>
                <span>{d}</span>
                {mode === m && <Check size={16} />}
              </button>
            ))}
          </div>
          <div className="practice-launch panel">
            <div>
              <span className="eyebrow">МАТЕРИАЛ ДЛЯ ТРЕНИРОВКИ</span>
              <h3>Выберите знакомую тему</h3>
            </div>
            <select
              value={practiceLesson}
              aria-label="Тема тренировки"
              onChange={(e) => setPracticeLesson(e.target.value)}
            >
              {lessons
                .filter((l) => mode !== "grammar" || l.form)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.level} · {l.title}
                  </option>
                ))}
            </select>
            <button
              className="primary"
              onClick={() => openLesson(lesson, mode)}
            >
              Начать практику <ArrowRight size={18} />
            </button>
          </div>
          <div className="two-columns">
            <section className="panel feature-panel">
              <RotateCcw className="cyan-text" size={27} />
              <h3>Ошибки — часть пути</h3>
              <p>
                {Object.keys(p.mistakes).length
                  ? `${Object.keys(p.mistakes).length} заданий для повторения. После верного ответа задание исчезнет из списка.`
                  : "Здесь появятся задания, которые стоит повторить. Пока ошибок нет."}
              </p>
              <button
                className="secondary"
                disabled={!Object.keys(p.mistakes).length}
                onClick={async () => {
                  const saved=Object.values(p.mistakes);
                  try {
                    const current=saved.some(e=>e.id.startsWith('vocab:'))?refreshVocabularyMistakes(saved,await loadVocabulary()):saved;
                    openLesson({...lessons[0],title:"Работа над ошибками"},"mixed",current);
                  } catch { notify('Не удалось загрузить актуальные исправления словаря. Подключитесь к сети и попробуйте снова.'); }
                }}
              >
                Разобрать ошибки <ArrowRight size={17} />
              </button>
            </section>
            <section className="panel feature-panel">
              <Layers className="violet-text" size={27} />
              <h3>Умное повторение SRS</h3>
              <p>
                Слова, которые вы помните, появляются реже. Сложные возвращаются
                через 10 минут.
              </p>
              <a className="secondary" href="#dictionary">
                Перейти к карточкам <ArrowRight size={17} />
              </a>
            </section>
          </div>
          <DialogueLibrary {...props}/>
          <VoiceRecorder notify={notify} />
          <div className="content-notice">
            <Volume2 size={20} />
            <p>
              Озвучка использует голос ro-RO устройства или локальные румынские
              аудиофайлы Piper/Mihai. При недоступности обоих источников
              показывается ошибка. Голосовая практика сравнивает текст
              распознавания и не выставляет оценку акцента. В ролевой практике
              можно выбрать разные уместные реплики и продолжения разговора.
            </p>
          </div>
        </>
      )}
      {page === "dictionary" && <Dictionary {...props} />}
      {page === "grammar" && (
        <>
          <div className="grammar-grid">
            {grammarTopics.map(([title, id], i) => (
              <button
                className={`grammar-card panel ${!id ? "unavailable" : ""}`}
                key={title}
                disabled={!id}
                onClick={() => openLesson(lessons.find((l) => l.id === id)!)}
              >
                <span className="lesson-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>
                    {id
                      ? "Объяснение · примеры · аудио · задания"
                      : "В разработке · следующий этап программы"}
                  </p>
                </div>
                {id ? <ArrowUpRight size={20} /> : <LockKeyhole size={18} />}
              </button>
            ))}
          </div>
          <div className="content-notice">
            <GraduationCap size={21} />
            <p>
              Формы глаголов и существительных смотрите также в словаре.
              Основные источники:{" "}
              <a href="https://doom.lingv.ro/" target="_blank" rel="noreferrer">
                DOOM³ · Институт лингвистики Румынской академии
              </a>
              . Для расширенных тем готовятся отдельные объяснения и упражнения.
            </p>
          </div>
        </>
      )}
      {page === "rail" && (
        <>
          <div className="rail-hero panel">
            <TrainFront size={52} />
            <div>
              <span className="eyebrow">ПРОФЕССИОНАЛЬНЫЙ РУМЫНСКИЙ</span>
              <h2>Понимать язык своей работы.</h2>
              <p>
                Доступен вводный урок «На станции». Остальные технические
                разделы находятся в разработке.
              </p>
              <button
                className="primary"
                onClick={() => openLesson(railLesson)}
              >
                Начать вводный урок <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div className="content-notice">
            <BookOpen size={23} />
            <p>
              Это изучение языка, а не обучение эксплуатации и безопасности.
              Термины сверены с{" "}
              <a
                href="https://cfr.ro/revizii-tehnice-si-reparatii-locomotive/"
                target="_blank"
                rel="noreferrer"
              >
                материалами CFR
              </a>{" "}
              и{" "}
              <a
                href="https://legislatie.just.ro/Public/DetaliiDocument/119179"
                target="_blank"
                rel="noreferrer"
              >
                официальным Portal Legislativ
              </a>
              . Учебные фразы не являются радиокомандами или официальными
              инструкциями.
            </p>
          </div>
          <div className="rail-grid">
            {railSections.map(([t, d], i) => (
              <article className="panel rail-topic" key={t}>
                <span className="text-tag">
                  {String(i + 1).padStart(2, "0")} ·{" "}
                  {i === 0 ? "ВВОДНЫЙ УРОК ДОСТУПЕН" : "В РАЗРАБОТКЕ"}
                </span>
                <h3>{t}</h3>
                <p>{d}</p>
                {i === 0 ? (
                  <button
                    className="text-button"
                    onClick={() => openLesson(railLesson)}
                  >
                    Открыть урок <ArrowRight size={16} />
                  </button>
                ) : (
                  <small className="muted">
                    Словарь, диалог и тест — следующий этап
                  </small>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {page === "intensive" && (
        <>
          <div className="content-notice">
            <CalendarDays size={22} />
            <p>
              <strong>Первые 16 дней доступны.</strong> Каждый день: слова и
              фразы, мини-грамматика, аудио и практика. Задания открыты в любом
              порядке; оставшиеся 14 дней в разработке. Курс не обещает
              достижения C1 за 30 дней.
            </p>
          </div>
          <div className="intensive-progress panel">
            <div>
              <span className="eyebrow">ВАШ РИТМ</span>
              <h3>{p.intensive.length} из 30 дней завершено</h3>
            </div>
            <div className="progress-bar">
              <i style={{ width: `${(p.intensive.length / 30) * 100}%` }} />
            </div>
          </div>
          <div className="days-grid">
            {intensiveTopics.map((t, i) => (
              <button
                className={`day-card ${i >= lessons.length ? "unavailable" : ""} ${p.intensive.includes(i) ? "completed" : ""}`}
                key={i}
                disabled={i >= lessons.length}
                onClick={() =>
                  openLesson(lessons[i], "mixed", undefined, false, i)
                }
              >
                <span>ДЕНЬ {String(i + 1).padStart(2, "0")}</span>
                <h3>{t}</h3>
                <small>
                  {i >= lessons.length
                    ? "В разработке"
                    : p.intensive.includes(i)
                      ? "Пройдено · можно повторить"
                      : `${lessons[i].minutes}–15 минут`}
                </small>
                {p.intensive.includes(i) ? (
                  <Check size={18} />
                ) : i >= lessons.length ? (
                  <LockKeyhole size={15} />
                ) : (
                  <ArrowUpRight size={17} />
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {page === "progress" && (
        <>
          <div className="progress-stats">
            {[
              [Zap, p.xp, "XP за практику"],
              [BookOpen, p.completed.length, "Пройдено уроков"],
              [Flame, streak(p), "Дней подряд"],
              [
                Target,
                p.attempts
                  ? Math.round((p.correct / p.attempts) * 100) + "%"
                  : "—",
                "Точность ответов",
              ],
            ].map(([I, value, label]) => {
              const Icon = I as typeof Zap;
              return (
                <div className="panel big-stat" key={String(label)}>
                  <Icon size={25} />
                  <strong>{String(value)}</strong>
                  <span>{String(label)}</span>
                </div>
              );
            })}
          </div>
          <div className="two-columns">
            <section className="panel feature-panel">
              <h3>Четыре стороны языка</h3>
              {(
                [
                  ["reading", "Чтение"],
                  ["listening", "Аудирование"],
                  ["writing", "Письмо"],
                  ["speaking", "Речь"],
                ] as const
              ).map(([id, label]) => {
                const s = p.skills[id];
                return (
                  <div className="skill-row" key={id}>
                    <div>
                      <span>{label}</span>
                      <span>
                        {s.total
                          ? `${Math.round((s.correct / s.total) * 100)}% · ${s.total} ответов`
                          : "Пока нет практики"}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <i
                        style={{
                          width: `${s.total ? (s.correct / s.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <small className="muted">
                Точность учебных ответов, а не оценка уровня CEFR. Для речи
                учитывается распознанный текст.
              </small>
            </section>
            <section className="panel feature-panel">
              <h3>Последние 14 дней</h3>
              <div className="activity-chart">
                {Array.from({ length: 14 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - 13 + i);
                  const count = p.activity[dayKey(d)] || 0;
                  return (
                    <div
                      key={i}
                      title={`${d.toLocaleDateString("ru")}: ${count} действий`}
                    >
                      <span>{count || ""}</span>
                      <i
                        style={{ height: `${Math.min(105, count * 7) + 4}px` }}
                      />
                      <small>{d.getDate()}</small>
                    </div>
                  );
                })}
              </div>
              <p>Ответы в упражнениях и повторения карточек.</p>
              <span className="cyan-text">
                Сегодня: {p.activity[dayKey()] || 0} действий ·{" "}
                {Object.keys(p.mistakes).length} ошибок к повторению
              </span>
            </section>
          </div>
          <div className="section-head">
            <h2>Ваши маленькие победы</h2>
            <span className="muted">Достижения открываются за действия</span>
          </div>
          <div className="achievements">
            {[
              [p.completed.length >= 1, "Первый шаг", "Завершите первый урок"],
              [
                Object.keys(p.reviews).length >= 10,
                "Коллекционер слов",
                "Повторите 10 разных слов",
              ],
              [streak(p) >= 3, "В своём ритме", "Занимайтесь 3 дня подряд"],
              [
                p.completed.filter((x) => x.startsWith("a0")).length === 6,
                "Хорошее начало",
                "Пройдите все уроки A0",
              ],
            ].map(([unlocked, title, desc]) => (
              <div
                className={`panel achievement ${unlocked ? "unlocked" : ""}`}
                key={String(title)}
              >
                <Trophy size={30} />
                <h3>{String(title)}</h3>
                <p>{String(desc)}</p>
                <span>{unlocked ? "Получено" : "Ещё впереди"}</span>
              </div>
            ))}
          </div>
          <div className="section-head">
            <h2>Прогресс по уровням</h2>
          </div>
          <div className="panel feature-panel">
            {levels.map((l) => {
              const total = lessons.filter((x) => x.level === l.id).length;
              const completed = lessons.filter(
                (x) => x.level === l.id && p.completed.includes(x.id),
              ).length;
              return (
                <div className="skill-row" key={l.id}>
                  <div>
                    <span>
                      {l.id} · {l.name}
                    </span>
                    <span>
                      {total ? `${completed}/${total} уроков` : "В разработке"}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <i
                      style={{
                        width: `${total ? (completed / total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {page === "settings" && (
        <div className="settings-grid">
          <AudioDiagnostics notify={notify} speed={p.speed} />
          <section className="panel settings-panel">
            <h3>
              <Settings size={22} /> Настройки обучения
            </h3>
            <label>
              <span>
                План занятий<small>Период личного учебного плана</small>
              </span>
              <select
                value={p.plan}
                onChange={(e) =>
                  update((prev) => ({ ...prev, plan: Number(e.target.value) }))
                }
              >
                {[15, 30, 60, 90].map((d) => (
                  <option value={d} key={d}>
                    {d} дней
                  </option>
                ))}
              </select>
            </label>
            <p className="plan-description">
              Ваш план на {p.plan} дней: ориентир —{" "}
              {Math.ceil((lessons.length / p.plan) * 7)} урока в неделю и 10
              заданий ежедневно. Открыто {p.completed.length} из{" "}
              {lessons.length} уроков.
            </p>
            <label>
              <span>
                Световые эффекты
                <small>
                  Системный reduced motion учитывается автоматически
                </small>
              </span>
              <button
                className={`toggle ${p.effects ? "on" : ""}`}
                role="switch"
                aria-checked={p.effects}
                aria-label="Световые эффекты"
                onClick={() =>
                  update((prev) => ({ ...prev, effects: !prev.effects }))
                }
              >
                <i />
              </button>
            </label>
            <label>
              <span>
                Скорость озвучки<small>Только румынский голос ro-RO</small>
              </span>
              <select
                value={p.speed}
                onChange={(e) =>
                  update((prev) => ({ ...prev, speed: Number(e.target.value) }))
                }
              >
                {[0.75, 1, 1.25].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              onClick={() =>
                speak("Bună ziua! Învăț limba română.", p.speed, notify)
              }
            >
              <Volume2 size={18} /> Проверить голос
            </button>
          </section>
          <section className="panel settings-panel">
            <h3>
              <Download size={22} /> Прогресс принадлежит вам
            </h3>
            <p>
              Хранится в IndexedDB этого браузера. Обновления приложения не
              удаляют данные. Экспортируйте копию перед сменой устройства или
              очисткой данных браузера.
            </p>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(p, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `romana-nova-${dayKey()}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  notify("Файл прогресса экспортирован.");
                }}
              >
                <Download size={18} /> Экспорт JSON
              </button>
              <button
                className="secondary"
                onClick={() => input.current?.click()}
              >
                <Upload size={18} /> Импорт JSON
              </button>
            </div>
            <input
              hidden
              ref={input}
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 2000000)
                    throw Error("Файл слишком большой. Максимум 2 МБ.");
                  const imported = validateProgress(
                    JSON.parse(await file.text()),
                  );
                  if (
                    window.confirm(
                      "Заменить текущий прогресс данными из файла? Экспортируйте текущие результаты, если хотите их сохранить.",
                    )
                  ) {
                    update(() => imported);
                    notify("Прогресс восстановлен из файла.");
                  }
                } catch (err) {
                  notify(
                    err instanceof Error
                      ? err.message
                      : "Не удалось импортировать файл.",
                  );
                } finally {
                  e.target.value = "";
                }
              }}
            />
            <small className="muted">
              Импорт заменяет текущие данные после вашего подтверждения. Файл
              проверяется перед применением.
            </small>
          </section>
          <section className="panel settings-panel">
            <h3>
              <Layers size={22} /> Академия всегда рядом
            </h3>
            <p>
              После первого открытия текстовые уроки и упражнения доступны
              офлайн. Полный словарь, фотографии и аудио сохраняются по мере
              загрузки. Голос ro-RO может требовать установленный языковой
              пакет; распознавание речи — интернет.
            </p>
            <p>
              Для установки: Chrome / Edge → «Установить приложение». На iPhone:
              Safari → «Поделиться» → «На экран Домой».
            </p>
            <span className="text-tag">PWA · ВЕРСИЯ 1.1.0</span>
          </section>
          <section className="panel settings-panel">
            <h3>
              <BookOpen size={22} /> О программе
            </h3>
            <p>
              Доступно: 6 уроков A0, 10 уроков A1, вводный железнодорожный урок,
              словарь из {catalogMeta.total.toLocaleString("ru")} единиц,
              основные тренажёры и интервальное повторение.
            </p>
            <p>
              A2–C1, расширенный технический курс, сюжетные диалоги и дни 17–30
              — в разработке. Академия не выдаёт сертификаты CEFR.
            </p>
            <p className="muted">
              Фотографии: Wikimedia Commons и Unsplash, с указанием лицензий.
              Словарные статьи: русский Викисловарь / Kaikki. Примеры: Tatoeba и
              авторские материалы. Технические источники указаны в
              железнодорожном разделе.
            </p>
          </section>
        </div>
      )}
    </motion.div>
  );
}
function VoiceRecorder({ notify }: { notify: (s: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioURL = useRef("");
  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state === "recording") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      if (audioURL.current) URL.revokeObjectURL(audioURL.current);
    },
    [],
  );
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify("Запись голоса не поддерживается этим браузером.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      chunks.current = [];
      recorder.current = new MediaRecorder(stream.current);
      recorder.current.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      recorder.current.onstop = () => {
        if (audioURL.current) URL.revokeObjectURL(audioURL.current);
        audioURL.current = URL.createObjectURL(
          new Blob(chunks.current, {
            type: recorder.current?.mimeType || "audio/webm",
          }),
        );
        setUrl(audioURL.current);
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.current.start();
      setRecording(true);
    } catch {
      notify("Нет доступа к микрофону. Разрешите его в настройках браузера.");
    }
  }
  return (
    <section className="panel recorder">
      <Mic size={26} />
      <div>
        <h3>Послушайте себя</h3>
        <p>
          Запишите фразу и сравните с румынской озвучкой. Запись остаётся на
          устройстве до закрытия раздела.
        </p>
      </div>
      <button
        className={recording ? "secondary recording" : "secondary"}
        onClick={() => (recording ? recorder.current?.stop() : start())}
      >
        {recording ? "Остановить запись" : "Записать голос"}
      </button>
      {url && <audio src={url} controls />}
    </section>
  );
}
