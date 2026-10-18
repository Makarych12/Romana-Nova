import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  LayoutDashboard,
  Map,
  Layers,
  BookOpen,
  TrainFront,
  CalendarDays,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Flame,
  Zap,
  Target,
  Volume2,
  Play,
  Check,
  Menu,
  X,
  WifiOff,
  Download,
  Sparkles,
  GraduationCap,
  Compass,
} from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { lessons, levels, words, type Lesson } from "./data/course";
import {
  fresh,
  readProgress,
  saveProgress,
  recordAnswer,
  streak,
  dayKey,
  type Progress,
} from "./lib/store";
import type {Dialogue} from "./data/dialogues";
import { type Mode, type Exercise } from "./lib/exercises";
import AcademyArt from "./components/AcademyArt";
import { speak, initializeAudio, stopAudio, setAudioRate } from "./lib/audio";
import { catalogMeta } from "./lib/vocabulary";
import { AudioBar } from "./components/AudioControls";
import AppUpdate from "./components/AppUpdate";
const ConversationPlayer=lazy(()=>import("./components/ConversationPlayer"));
const LessonPlayer = lazy(() => import("./components/LessonPlayer"));
const AcademyPages = lazy(() => import("./pages/AcademyPages"));
export type Page =
  | "home"
  | "course"
  | "practice"
  | "dictionary"
  | "grammar"
  | "rail"
  | "intensive"
  | "progress"
  | "settings";
export type PageProps = {
  page: Page;
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  openLesson: (
    lesson: Lesson,
    mode?: Mode,
    custom?: Exercise[],
    exam?: boolean,
    day?: number,
  ) => void;
  openConversation:(dialogue:Dialogue)=>void;
  notify: (s: string) => void;
};
const navigation: [Page, string, typeof Map][] = [
  ["home", "Обзор", LayoutDashboard],
  ["course", "Мой путь", Map],
  ["practice", "Практика", Layers],
  ["dictionary", "Словарь", BookOpen],
  ["grammar", "Грамматика", GraduationCap],
  ["rail", "Железная дорога", TrainFront],
  ["intensive", "Румынский за 30 дней", CalendarDays],
  ["progress", "Мой прогресс", ChartNoAxesCombined],
];
export default function App() {
  const [page, setPage] = useState<Page>(() => {
    const p = location.hash.slice(1).split("/")[0] as Page;
    return [...navigation.map((n) => n[0]), "settings"].includes(p)
      ? p
      : "home";
  });
  const [progress, setProgress] = useState<Progress>(fresh);
  const [ready, setReady] = useState(false);
  const [storageOK, setStorageOK] = useState(true);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [active, setActive] = useState<{
    lesson: Lesson;
    mode: Mode;
    custom?: Exercise[];
    exam?: boolean;
    day?: number;
  } | null>(null);
  const [conversation,setConversation]=useState<Dialogue|null>(null);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  useEffect(() => {
    initializeAudio();
  }, []);
  useEffect(() => {
    setAudioRate(progress.speed);
  }, [progress.speed]);
  const notify = useCallback((s: string) => setMessage(s), []);
  useEffect(() => {
    readProgress()
      .then(setProgress)
      .catch(() => {
        setStorageOK(false);
        notify(
          "Не удалось прочитать локальные данные. Автосохранение приостановлено, чтобы сохранить существующий профиль. Сделайте экспорт и проверьте доступ к хранилищу.",
        );
      })
      .finally(() => setReady(true));
  }, [notify]);
  useEffect(() => {
    if (!ready || !storageOK) return;
    saveProgress(progress).catch(() => {
      setStorageOK(false);
      notify(
        "Не удалось сохранить прогресс. Экспортируйте JSON в настройках, чтобы не потерять результаты.",
      );
    });
  }, [progress, ready, storageOK, notify]);
  useEffect(() => {
    const status = () => setOffline(!navigator.onLine);
    const hash = () => {
      const p = location.hash.slice(1).split("/")[0] as Page;
      setPage(
        [...navigation.map((n) => n[0]), "settings"].includes(p) ? p : "home",
      );
      setMobileMenu(false);
      window.scrollTo(0, 0);
    };
    const before = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("online", status);
    window.addEventListener("offline", status);
    window.addEventListener("hashchange", hash);
    window.addEventListener("beforeinstallprompt", before);
    return () => {
      window.removeEventListener("online", status);
      window.removeEventListener("offline", status);
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("beforeinstallprompt", before);
    };
  }, []);
  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(""), 8500);
      return () => clearTimeout(id);
    }
  }, [message]);
  const update = useCallback(
    (fn: (p: Progress) => Progress) => setProgress((p) => fn(p)),
    [],
  );
  const openLesson: PageProps["openLesson"] = (
    lesson,
    mode = "mixed",
    custom,
    exam = false,
    day,
  ) => setActive({ lesson, mode, custom, exam, day });
  const navigate = (p: Page) => {
    location.hash = p;
    setPage(p);
    setMobileMenu(false);
    window.scrollTo({ top: 0 });
  };
  const next =
    lessons.find((l) => !progress.completed.includes(l.id)) || lessons[0];
  const learned = Object.values(progress.reviews).filter(
    (x) => x.reps >= 3,
  ).length;
  const due = Math.max(
    0,
    catalogMeta.total -
      Object.values(progress.reviews).filter((r) => r.due > Date.now()).length,
  );
  const today = progress.activity[dayKey()] || 0;
  const complete = (score: number) => {
    if (!active) return;
    update((p) => {
      const n = structuredClone(p);
      if (active.exam) n.examResults[active.lesson.level] = score;
      else if (score >= 80 && !active.custom) {
        n.lessonActivity[dayKey()] = (n.lessonActivity[dayKey()] || 0) + 1;
        if (!n.completed.includes(active.lesson.id)) {
          n.completed.push(active.lesson.id);
          n.xp += 30;
        }
        if (active.day !== undefined && !n.intensive.includes(active.day))
          n.intensive.push(active.day);
      }
      return n;
    });
    if (score >= 80)
      notify("Отличная работа! Результат сохранён в вашем прогрессе.");
  };
  if (!ready)
    return (
      <div className="loading-screen">
        <div className="brand-mark">N</div>
        <p>Открываем вашу академию…</p>
      </div>
    );
  return (
    <MotionConfig reducedMotion={progress.effects ? "user" : "always"}>
      <div className={`app ${progress.effects ? "" : "quiet"}`}>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          Перейти к содержимому
        </a>
        <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
          <a className="brand" href="#home" aria-label="ROMÂNA NOVA — обзор">
            <span className="brand-mark">
              N<i />
            </span>
            <span>
              ROMÂNA <b>NOVA</b>
              <small>ROMANIAN LANGUAGE ACADEMY</small>
            </span>
          </a>
          <div className="sidebar-label">ВАША АКАДЕМИЯ</div>
          <nav aria-label="Основная навигация">
            {navigation.map(([id, label, Icon], i) => (
              <a
                href={`#${id}`}
                key={id}
                aria-current={page === id ? "page" : undefined}
                className={`${page === id ? "active" : ""} ${i === 5 ? "nav-separator" : ""}`}
                onClick={() => {
                  setMobileMenu(false);
                  window.scrollTo(0, 0);
                }}
              >
                <Icon size={20} />
                <span>{label}</span>
                {id === "practice" &&
                  Object.keys(progress.mistakes).length > 0 && (
                    <small className="nav-badge">
                      {Object.keys(progress.mistakes).length}
                    </small>
                  )}
                {page === id && <i />}
              </a>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="journey-card">
              <span className="tiny-orbit">
                <Compass size={25} />
              </span>
              <strong>
                Маленький шаг.
                <br />
                Большое будущее.
              </strong>
              <p>
                Румынский открывает двери.
                <br />
                Продолжайте каждый день.
              </p>
              <button onClick={() => navigate("course")}>
                Продолжить путь <ArrowUpRight size={16} />
              </button>
            </div>
            <a
              className={`settings-link ${page === "settings" ? "active" : ""}`}
              href="#settings"
            >
              <Settings size={19} /> Настройки <span aria-hidden="true">⌘</span>
            </a>
            <div className="profile">
              <div className="avatar">ВЫ</div>
              <div>
                <strong>Ваше пространство</strong>
                <span>Без регистрации · локально</span>
              </div>
              <span className="status-dot" />
            </div>
          </div>
        </aside>
        {mobileMenu && (
          <button
            className="menu-scrim"
            onClick={() => setMobileMenu(false)}
            aria-label="Закрыть меню"
          />
        )}
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-btn mobile-menu"
                aria-label="Открыть меню"
                aria-expanded={mobileMenu}
                onClick={() => setMobileMenu(!mobileMenu)}
              >
                {mobileMenu ? <X size={22} /> : <Menu size={22} />}
              </button>
              <span>Академия</span>
              <ChevronRight size={14} />
              <strong>
                {navigation.find((n) => n[0] === page)?.[1] || "Настройки"}
              </strong>
            </div>
            <div className="topbar-right">
              <span className="local-status">
                <span className="status-dot" />
                {offline ? "Офлайн-режим" : "Прогресс на устройстве"}
              </span>
              <div className="top-stat">
                <Flame size={17} />
                {streak(progress)} <small>дней</small>
              </div>
              <div className="top-stat xp">
                <Zap size={16} />
                {progress.xp} <small>XP</small>
              </div>
              <button
                className="avatar small"
                aria-label="Открыть настройки профиля"
                onClick={() => navigate("settings")}
              >
                ВЫ
              </button>
            </div>
          </header>
          {offline && (
            <div className="offline-banner">
              <WifiOff size={16} /> Вы офлайн. Загруженные уроки и упражнения
              доступны; озвучка зависит от устройства.
            </div>
          )}
          <main id="main-content" tabIndex={-1}>
            <AppUpdate notify={notify} beforeUpdate={async () => {
              if (!ready || !storageOK) throw Error("Progress is not ready to save");
              await saveProgress(progress);
            }} />
            {page === "home" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="dashboard"
              >
                <div className="welcome-row">
                  <div>
                    <div className="eyebrow">
                      <span className="mini-flag">
                        <i />
                        <i />
                        <i />
                      </span>{" "}
                      РУМЫНСКИЙ — ВАШ НОВЫЙ ГОРИЗОНТ
                    </div>
                    <h1>
                      Bun venit! <span>Добро пожаловать.</span>
                    </h1>
                    <p>Каждое слово — шаг к новой жизни. Начнём?</p>
                  </div>
                  <button
                    className="date-pill"
                    onClick={() => navigate("intensive")}
                  >
                    <CalendarDays size={17} />
                    {new Intl.DateTimeFormat("ru", {
                      day: "numeric",
                      month: "long",
                    }).format(new Date())}
                    <ChevronRight size={14} />
                  </button>
                </div>
                <section className="hero">
                  <div className="hero-copy">
                    <div className="hero-tag">
                      <span /> ВАША ЛИЧНАЯ ЯЗЫКОВАЯ АКАДЕМИЯ
                    </div>
                    <h2>
                      Новый язык.
                      <br />
                      <span>Новые горизонты.</span>
                    </h2>
                    <p>
                      От первого <b>«Bună!»</b> до уверенного общения.
                      <br />
                      Румынский язык, который становится частью вас.
                    </p>
                    <div className="hero-actions">
                      <button
                        className="primary"
                        onClick={() => openLesson(next)}
                      >
                        {progress.completed.length
                          ? "Продолжить обучение"
                          : "Начать мой путь"}
                        <ArrowRight size={18} />
                      </button>
                      <button
                        className="hero-link"
                        onClick={() => navigate("course")}
                      >
                        Программа курса <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="hero-foot">
                      <span>
                        <Check size={13} /> В вашем темпе
                      </span>
                      <span>
                        <Check size={13} /> С нуля, шаг за шагом
                      </span>
                      <span>
                        <Check size={13} /> Без подписки
                      </span>
                    </div>
                  </div>
                  <AcademyArt />
                </section>
                <div className="stats-grid">
                  {[
                    [
                      Flame,
                      "Серия занятий",
                      `${streak(progress)}`,
                      "дней",
                      "orange",
                    ],
                    [Zap, "Ваша энергия", `${progress.xp}`, "XP", "blue"],
                    [BookOpen, "Изучено слов", `${learned}`, "слов", "cyan"],
                    [
                      Target,
                      "Цель на сегодня",
                      `${Math.min(today, 10)}/10`,
                      "заданий",
                      "violet",
                    ],
                  ].map(([Icon, label, value, unit, color]) => {
                    const I = Icon as typeof Flame;
                    return (
                      <div className="stat-card" key={String(label)}>
                        <div className={`stat-icon ${color}`}>
                          <I size={21} />
                        </div>
                        <div>
                          <span>{String(label)}</span>
                          <strong>
                            {String(value)} <small>{String(unit)}</small>
                          </strong>
                        </div>
                        {color === "violet" && (
                          <svg viewBox="0 0 40 40" className="mini-progress">
                            <circle cx="20" cy="20" r="16" />
                            <circle
                              cx="20"
                              cy="20"
                              r="16"
                              pathLength={100}
                              strokeDasharray={`${Math.min(today, 10) * 10} 100`}
                            />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="dashboard-columns">
                  <div className="left-column">
                    <div className="section-head">
                      <h2>
                        Ваш учебный путь{" "}
                        <span className="text-tag">A0 → C1</span>
                      </h2>
                      <button onClick={() => navigate("course")}>
                        Вся программа <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <section className="path-card">
                      <div className="level-track">
                        {levels.map((l, i) => (
                          <button
                            key={l.id}
                            className={`${i === 0 ? "current" : ""} ${i > 1 ? "future" : ""}`}
                            onClick={() => navigate("course")}
                            aria-label={`Открыть уровень ${l.id}`}
                          >
                            <div className="level-node">{l.id}</div>
                            <span>
                              {
                                [
                                  "Старт",
                                  "Основы",
                                  "База",
                                  "Общение",
                                  "Свобода",
                                  "Мастерство",
                                ][i]
                              }
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="path-detail">
                        <span className="level-tag">{next.level}</span>
                        <div>
                          <strong>
                            {next.level === "A0"
                              ? "С самого начала"
                              : "Первые открытия"}
                          </strong>
                          <p>
                            {next.level === "A0"
                              ? "Первые слова, звуки и маленькие победы."
                              : "Грамматика и фразы для повседневной жизни."}
                          </p>
                        </div>
                        <span className="muted">
                          {
                            lessons.filter(
                              (l) =>
                                l.level === next.level &&
                                progress.completed.includes(l.id),
                            ).length
                          }
                          /
                          {lessons.filter((l) => l.level === next.level).length}{" "}
                          уроков
                        </span>
                      </div>
                      <div className="progress-bar">
                        <i
                          style={{
                            width: `${(progress.completed.filter((id) => id.startsWith(next.level.toLowerCase())).length / lessons.filter((l) => l.level === next.level).length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="continue-lesson">
                        <div className="lesson-play">
                          <Play size={21} fill="currentColor" />
                        </div>
                        <div>
                          <span>СЛЕДУЮЩИЙ УРОК</span>
                          <strong>{next.title}</strong>
                          <p>
                            {next.subtitle} <i /> {next.minutes} минут
                          </p>
                        </div>
                        <button
                          className="round-arrow"
                          aria-label={`Начать урок ${next.title}`}
                          onClick={() => openLesson(next)}
                        >
                          <ArrowRight size={21} />
                        </button>
                      </div>
                    </section>
                    <div className="section-head practice-head">
                      <h2>Немного практики — каждый день</h2>
                      <span className="muted">Всё начинается с привычки</span>
                    </div>
                    <div className="quick-practice">
                      {[
                        [
                          Layers,
                          "Карточки слов",
                          "Знакомьтесь. Запоминайте. Повторяйте.",
                          "cyan",
                          "dictionary",
                        ],
                        [
                          Volume2,
                          "Слушайте и понимайте",
                          "Привыкайте к звучанию румынского.",
                          "violet",
                          "listen",
                        ],
                        [
                          BookOpen,
                          "Собирайте фразы",
                          "От отдельных слов — к разговору.",
                          "blue",
                          "build",
                        ],
                      ].map(([Icon, title, desc, color, target]) => {
                        const I = Icon as typeof Layers;
                        return (
                          <button
                            className="practice-card"
                            key={String(title)}
                            onClick={() =>
                              target === "dictionary"
                                ? navigate("dictionary")
                                : openLesson(next, target as Mode)
                            }
                          >
                            <span className={`stat-icon ${color}`}>
                              <I size={22} />
                            </span>
                            <ArrowUpRight className="card-arrow" size={17} />
                            <strong>{String(title)}</strong>
                            <p>{String(desc)}</p>
                            <span className="card-foot">
                              {target === "dictionary"
                                ? `${catalogMeta.total.toLocaleString("ru")} слов`
                                : "5 минут в вашем темпе"}{" "}
                              <ArrowRight size={14} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="right-column">
                    <div className="section-head">
                      <h2>Сегодня — ещё ближе</h2>
                      <span className="live-dot" />
                    </div>
                    <section className="daily-card">
                      <div className="daily-title">
                        <span className="stat-icon cyan">
                          <Target size={20} />
                        </span>
                        <div>
                          <strong>Ваш план на сегодня</strong>
                          <span>15 минут для себя</span>
                        </div>
                      </div>
                      {[
                        [
                          "Пройдите один урок",
                          "Всего один шаг вперёд",
                          !!progress.lessonActivity[dayKey()],
                          () => openLesson(next),
                        ],
                        [
                          "Повторите слова",
                          `${due} карточек ждут вас`,
                          Object.keys(progress.reviews).length > 0,
                          () => navigate("dictionary"),
                        ],
                        [
                          "Выполните 10 заданий",
                          `${Math.min(today, 10)} из 10 — в вашем темпе`,
                          today >= 10,
                          () => navigate("practice"),
                        ],
                      ].map(([title, desc, done, action]) => (
                        <button
                          className="daily-task"
                          key={String(title)}
                          onClick={action as () => void}
                        >
                          <span className={`task-check ${done ? "done" : ""}`}>
                            {done && <Check size={13} />}
                          </span>
                          <span>
                            <strong>{String(title)}</strong>
                            <small>{String(desc)}</small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                      <div className="daily-note">
                        <Sparkles size={15} /> Регулярность важнее скорости
                      </div>
                    </section>
                    <section className="word-of-day">
                      <div className="eyebrow">
                        СЛОВО ДНЯ <span>CUVÂNTUL ZILEI</span>
                      </div>
                      <div className="word-main">
                        <strong lang="ro">împreună</strong>
                        <button
                          className="icon-btn"
                          aria-label="Послушать împreună"
                          onClick={() =>
                            speak("împreună", progress.speed, notify)
                          }
                        >
                          <Volume2 size={20} />
                        </button>
                      </div>
                      <p>
                        вместе <span>наречие</span>
                      </p>
                      <div className="word-example">
                        <button className="text-button" lang="ro" aria-label="Послушать пример Învățăm împreună." onClick={()=>speak("Învățăm împreună.",progress.speed,notify)}>Învățăm împreună. <Volume2 size={12}/></button>
                        <small>Мы учимся вместе.</small>
                      </div>
                      <button onClick={() => navigate("dictionary")}>
                        Открыть словарь <ArrowRight size={15} />
                      </button>
                    </section>
                  </div>
                </div>
                <section className="special-course">
                  <div className="rail-symbol">
                    <TrainFront size={32} />
                  </div>
                  <div>
                    <span className="eyebrow">ЯЗЫК ВАШЕЙ ПРОФЕССИИ</span>
                    <h3>Румынский на железной дороге</h3>
                    <p>
                      Терминология, общение с коллегами и профессиональные
                      диалоги.
                    </p>
                  </div>
                  <span className="text-tag">СПЕЦКУРС</span>
                  <button
                    className="secondary"
                    onClick={() => navigate("rail")}
                  >
                    Открыть модуль <ArrowUpRight size={17} />
                  </button>
                </section>
                <footer>
                  <span>
                    ROMÂNA NOVA <i>·</i> Ваш следующий шаг начинается здесь.
                  </span>
                  <span>
                    <span className="mini-flag">
                      <i />
                      <i />
                      <i />
                    </span>{" "}
                    С любовью к языку и новым возможностям
                  </span>
                </footer>
              </motion.div>
            ) : (
              <Suspense
                fallback={<p className="loading-content">Открываем раздел…</p>}
              >
                <AcademyPages
                  page={page}
                  progress={progress}
                  update={update}
                  openLesson={openLesson}
                  notify={notify}
                  openConversation={d=>{stopAudio();setConversation(d)}}
                />
              </Suspense>
            )}
          </main>
        </div>
        <nav className="bottom-nav" aria-label="Мобильная навигация">
          {navigation.slice(0, 4).map(([id, label, Icon]) => (
            <a className={page === id ? "active" : ""} href={`#${id}`} key={id}>
              <Icon size={21} />
              <span>{label}</span>
            </a>
          ))}
          <button onClick={() => setMobileMenu(true)}>
            <Menu size={21} />
            <span>Ещё</span>
          </button>
        </nav>
        {!active && !conversation && (
          <AudioBar
            notify={notify}
            onRateChange={(speed) => update((p) => ({ ...p, speed }))}
          />
        )}
        {message && (
          <div className="toast" role="status">
            <span>{message}</span>
            <button
              className="icon-btn"
              onClick={() => setMessage("")}
              aria-label="Закрыть уведомление"
            >
              <X size={17} />
            </button>
          </div>
        )}
        {install && page === "settings" && (
          <div className="install-banner">
            <button
              className="primary"
              onClick={async () => {
                await install.prompt();
                setInstall(null);
              }}
            >
              <Download size={18} /> Установить приложение
            </button>
          </div>
        )}
        {conversation&&<Suspense fallback={<div className="modal-backdrop">Открываем разговор…</div>}><ConversationPlayer dialogue={conversation} speed={progress.speed} onClose={()=>setConversation(null)} notify={notify} onComplete={(id,choices)=>{update(p=>{const n=structuredClone(p);n.dialoguePractice??={};const first=!n.dialoguePractice[id];n.dialoguePractice[id]={at:new Date().toISOString(),choices};n.activity[dayKey()]=(n.activity[dayKey()]||0)+1;if(first)n.xp+=20;return n});notify('Разговор завершён. Результат практики сохранён.');setConversation(null)}}/></Suspense>}
        {active && (
          <Suspense
            fallback={
              <div className="modal-backdrop">
                <p>Открываем урок…</p>
              </div>
            }
          >
            <LessonPlayer
              key={`${active.lesson.id}-${active.mode}`}
              {...active}
              speed={progress.speed}
              onClose={() => setActive(null)}
              onAnswer={(e, ok) => update((p) => recordAnswer(p, e, ok))}
              onComplete={complete}
              notify={notify}
            />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
}
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}
