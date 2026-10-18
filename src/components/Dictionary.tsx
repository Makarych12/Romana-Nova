import { useState, useEffect, useMemo, useDeferredValue } from "react";
import {
  Search,
  Volume2,
  Heart,
  RotateCcw,
  Check,
  ArrowRight,
  ArrowLeft,
  Layers,
  BookOpen,
  Camera,
} from "lucide-react";
import { motion } from "motion/react";
import type { PageProps } from "../App";
import { levels, type Word } from "../data/course";
import { loadVocabulary, originalWords, catalogMeta, vocabularyNotice } from "../lib/vocabulary";
import { reviewWord } from "../lib/store";
import { speak, stopAudio } from "../lib/audio";
import {
  cardModes,
  vocabularyExercises,
  vocabularyLesson,
  type CardMode,
} from "../lib/vocabulary-exercises";
import {qualityLabels,type QualityCode} from "../lib/quality-audit";
import SafeImage from "./SafeImage";
import { SoundCheck } from "./AudioControls";
const size = 24;
export default function Dictionary({
  progress: p,
  update,
  openLesson,
  notify,
}: PageProps) {
  const [words, setWords] = useState<Word[]>(originalWords);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice,setNotice]=useState("");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [theme, setTheme] = useState("Все темы");
  const [level, setLevel] = useState(() => {
    const value = location.hash.split("/")[1];
    return levels.some((l) => l.id === value) ? value : "all";
  });
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "cards">("list");
  const [page, setPage] = useState(0);
  const [card, setCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<CardMode>("ro-ru");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setWords(await loadVocabulary());setNotice(vocabularyNotice());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Словарь недоступен.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const selectLevel = () => {
      const value = location.hash.split("/")[1];
      if (levels.some((l) => l.id === value)) setLevel(value);
    };
    window.addEventListener("hashchange", selectLevel);
    return () => {
      stopAudio();
      window.removeEventListener("hashchange", selectLevel);
    };
  }, []);
  useEffect(() => {
    setPage(0);
    setCard(0);
    setFlipped(false);
    stopAudio();
  }, [query, theme, level, filter, view]);
  const dictionary = useMemo(
    () =>
      words.filter((w) => {
        const r = p.reviews[w.id];
        const text = `${w.ro} ${w.ru}`.toLocaleLowerCase("ro");
        return (
          (!deferred || text.includes(deferred.toLocaleLowerCase("ro"))) &&
          (theme === "Все темы" || w.theme === theme) &&
          (level === "all" || w.level === level) &&
          (filter === "all" ||
            (filter === "favorites" && p.favorites.includes(w.id)) ||
            (filter === "due" && (!r || r.due <= Date.now())) ||
            (filter === "learned" && r?.reps >= 3) ||
            (filter === "difficult" && r?.reps === 0) ||
            (filter === "photo" && w.image) ||
            (filter === "examples" && w.examples.length >= 2) ||
            (filter === "curated" && w.quality !== "reference")||
            (filter==="reviewed"&&w.editorial?.examplesReviewed===true&&w.editorial?.status==='reviewed')||
            (filter==="needs-review"&&!!w.reviewFlags?.length))
        );
      }),
    [words, deferred, theme, level, filter, p.reviews, p.favorites],
  );
  const current = card % dictionary.length;
  const word = dictionary[current];
  const pages = Math.max(1, Math.ceil(dictionary.length / size));
  const safePage = Math.min(page, pages - 1);
  function mark(known: boolean) {
    if (!word) return;
    stopAudio();
    update((prev) => reviewWord(prev, word.id, known));
    setFlipped(false);
    if (!["due", "difficult", "learned"].includes(filter))
      setCard((i) => (i + 1) % dictionary.length);
    notify(
      known
        ? "Следующее повторение назначено по SRS."
        : "Это слово добавлено в трудные. Повторим через 10 минут.",
    );
  }
  function train(exam = false) {
    const exercises = vocabularyExercises(dictionary, mode, exam ? 20 : 10);
    if (!exercises.length) {
      notify(
        mode === "photo"
          ? "В выбранной группе нет фотографий. Выберите другую тему или режим."
          : "Выберите слова для тренировки.",
      );
      return;
    }
    stopAudio();
    openLesson(
      {
        ...vocabularyLesson(dictionary),
        title: exam ? "Лексическая контрольная" : "Словарная практика",
      },
      "mixed",
      exercises,
      false,
    );
  }
  function favorite(w: Word) {
    update((prev) => ({
      ...prev,
      favorites: prev.favorites.includes(w.id)
        ? prev.favorites.filter((x) => x !== w.id)
        : [...prev.favorites, w.id],
    }));
  }
  return (
    <>
      <SoundCheck speed={p.speed} notify={notify} />
      <div className="content-notice">
        <BookOpen size={21} />
        <p>
          <strong>
            {catalogMeta.total.toLocaleString("ru")} уникальных слов и
            выражений.
          </strong>{" "}
          {catalogMeta.curated} учебных карточек; остальные — справочные статьи
          из открытого Викисловаря. У {catalogMeta.withTwoExamples} есть два
          примера. У {catalogMeta.withTwoReviewedExamples} пар примеров выполнена редакторская проверка агентом; независимой проверки носителем нет. Уровни импортированных статей оценочные, переводы и неполные
          примеры требуют редакторской проверки. Это расширение словаря, а не
          готовый курс C1.
        </p>
      </div>
      {notice&&<p className="dictionary-error" role="status">{notice}</p>}
      {loading && (
        <p className="muted" role="status">
          Загружаем полный словарь. Начальные карточки уже доступны…
        </p>
      )}
      {error && (
        <div className="dictionary-error">
          <p role="alert">
            {error} Доступны {words.length} ранее открытых начальных карточек.
          </p>
          <button className="secondary" onClick={load}>
            Повторить загрузку
          </button>
        </div>
      )}
      <div className="dictionary-controls">
        <label className="search-field">
          <Search size={19} />
          <input
            placeholder="Слово на румынском или русском…"
            aria-label="Поиск слов"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Уровень словаря"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="all">Все уровни</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id} · {l.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Тема словаря"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          {["Все темы", ...new Set(words.map((w) => w.theme))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div className="segmented">
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            Словарь
          </button>
          <button
            className={view === "cards" ? "active" : ""}
            onClick={() => setView("cards")}
          >
            Карточки
          </button>
        </div>
      </div>
      <div className="filter-row">
        {[
          ["all", `Все слова · ${words.length}`],
          ["favorites", `Избранное · ${p.favorites.length}`],
          ["due", "К повторению"],
          ["learned", "Изученные"],
          ["difficult", "Трудные"],
          ["photo", `С фотографиями · ${catalogMeta.photos}`],
          ["examples", "С двумя примерами"],
          ["curated", "Учебные карточки"],
              ["reviewed","Примеры просмотрены редактором"],
              ["needs-review","Нужна проверка"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        <span className="muted">Найдено: {dictionary.length}</span>
      </div>
      <section className="vocabulary-training panel">
        <div>
          <Layers size={22} />
          <h3>Практика выбранных слов</h3>
        </div>
        <select
          aria-label="Режим карточек"
          value={mode}
          onChange={(e) => setMode(e.target.value as CardMode)}
        >
          {cardModes.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <button
          className="primary"
          disabled={!dictionary.length}
          onClick={() => train()}
        >
          Тренировать <ArrowRight size={17} />
        </button>
        <button
          className="secondary"
          disabled={!dictionary.length}
          onClick={() => train(true)}
        >
          Контрольная · 20 слов
        </button><button className="secondary" onClick={()=>{const exercises=vocabularyExercises(dictionary,'photo');if(!exercises.length){notify('В выбранной группе нет фотографий. Измените фильтр.');return}openLesson({...vocabularyLesson(dictionary),title:'Фотография → румынское слово'},'mixed',exercises)}}><Camera size={17}/> Тренировать по фотографиям</button>
        <p>
          Фильтры задают материал тренировки. Ответы обновляют SRS, ошибки и
          навыки. Лексическая контрольная не подтверждает уровень CEFR.
        </p>
      </section>
      {!dictionary.length ? (
        <div className="empty-state">
          <Search size={32} />
          <h3>Пока ничего не найдено</h3>
          <p>
            Измените запрос или фильтр. Сложные слова появляются после ошибок
            или кнопки «Ещё учу».
          </p>
        </div>
      ) : view === "cards" ? (
        <div className="flashcard-area">
          <span className="eyebrow">
            КАРТОЧКА {current + 1} ИЗ {dictionary.length} · ИНТЕРВАЛЬНОЕ
            ПОВТОРЕНИЕ
          </span>
          <button
            className="flashcard"
            onClick={() => setFlipped(!flipped)}
            aria-label="Перевернуть карточку"
          >
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45 }}
              className="flashcard-inner"
            >
              <div className="flashcard-face">
                {word.image && <SafeImage src={word.image} alt={word.ru} />}
                <span className="level-tag">
                  {word.level}
                  {word.levelEstimated ? "*" : ""}
                </span>
                <strong lang="ro">{word.ro}</strong>
                <p>{word.pos}</p>
                <small>Нажмите, чтобы увидеть перевод</small>
              </div>
              <div className="flashcard-face back">
                <strong>{word.ru}</strong>
                <p>{word.forms || "Грамматические формы ещё не проверены"}</p>
                {word.examples[0] ? (
                  <>
                    <span lang="ro">{word.examples[0].ro}</span>
                    <small>{word.examples[0].ru}</small>
                  </>
                ) : (
                  <small>
                    Для этой справочной статьи примеры ещё не добавлены.
                  </small>
                )}
              </div>
            </motion.div>
          </button>
          <button
            className="audio-pill"
            onClick={() => speak(word.ro, p.speed, notify)}
          >
            <Volume2 size={20} /> Послушать
          </button>
          <div className="button-row">
            <button className="secondary" onClick={() => mark(false)}>
              Ещё учу <RotateCcw size={17} />
            </button>
            <button className="primary" onClick={() => mark(true)}>
              Помню <Check size={18} />
            </button>
          </div>
          <div className="card-navigation">
            <button
              className="icon-btn"
              aria-label="Предыдущая карточка"
              onClick={() => {
                stopAudio();
                setFlipped(false);
                setCard((i) => (i - 1 + dictionary.length) % dictionary.length);
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              className="icon-btn"
              aria-label="Следующая карточка"
              onClick={() => {
                stopAudio();
                setFlipped(false);
                setCard((i) => (i + 1) % dictionary.length);
              }}
            >
              <ArrowRight size={20} />
            </button>
          </div>
          <WordExamples word={word} speed={p.speed} notify={notify} />
          <WordQuality word={word}/>
          <Attribution word={word} />
          <p className="muted">
            «Помню»: повторение через 1, 2, 4 дня и далее. Слово считается
            изученным после трёх успешных повторений. * Уровень оценочный.
          </p>
        </div>
      ) : (
        <>
          <div className="dictionary-grid">
            {dictionary
              .slice(safePage * size, (safePage + 1) * size)
              .map((w) => (
                <article className="word-card" key={w.id}>
                  {w.image && (
                    <SafeImage
                      className="word-photo"
                      src={w.image}
                      alt={w.ru}
                    />
                  )}
                  <div className="word-card-body">
                    <div className="word-card-top">
                      <span className="text-tag">
                        {w.level}
                        {w.levelEstimated ? "*" : ""} · {w.theme}
                      </span>
                      <button
                        className={`icon-btn ${p.favorites.includes(w.id) ? "favorite" : ""}`}
                        aria-label={`${p.favorites.includes(w.id) ? "Убрать из избранного" : "Добавить в избранное"}: ${w.ro}`}
                        onClick={() => favorite(w)}
                      >
                        <Heart
                          size={18}
                          fill={
                            p.favorites.includes(w.id) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    </div>
                    <div className="word-main">
                      <h3 lang="ro">{w.ro}</h3>
                      <button
                        className="icon-btn"
                        aria-label={`Озвучить ${w.ro}`}
                        onClick={() => speak(w.ro, p.speed, notify)}
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                    <strong>{w.ru}</strong>
                    <small className="word-forms">
                      {w.pos} · {w.forms || "Формы ещё не проверены"}
                    </small>
                    <WordExamples word={w} speed={p.speed} notify={notify} />
                    <WordQuality word={w}/>
                    <span className="word-state">
                      {p.reviews[w.id]
                        ? `Повторений: ${p.reviews[w.id].reps} · ${p.reviews[w.id].due <= Date.now() ? "пора повторить" : `до ${new Date(p.reviews[w.id].due).toLocaleDateString("ru")}`}`
                        : "Новое слово"}
                    </span>
                    <div className="word-review-row">
                      <button
                        className="text-button"
                        onClick={() => {
                          stopAudio();
                          update((prev) => reviewWord(prev, w.id, true));
                          notify("Повторение сохранено.");
                        }}
                      >
                        <Check size={13} /> Повторил
                      </button>
                      {w.quality === "reference" && (
                        <small>Справочная статья · {w.level} оценочно</small>
                      )}
                    </div>
                    <Attribution word={w} />
                  </div>
                </article>
              ))}
          </div>
          <div className="dictionary-pagination">
            <button
              className="secondary"
              disabled={safePage === 0}
              onClick={() => {
                setPage(safePage - 1);
                stopAudio();
              }}
            >
              <ArrowLeft size={17} /> Назад
            </button>
            <span>
              Страница {safePage + 1} из {pages}
              <small>На экране не более {size} карточек</small>
            </span>
            <button
              className="secondary"
              disabled={safePage >= pages - 1}
              onClick={() => {
                setPage(safePage + 1);
                stopAudio();
              }}
            >
              Далее <ArrowRight size={17} />
            </button>
          </div>
        </>
      )}
    </>
  );
}
function WordExamples({
  word,
  speed,
  notify,
}: {
  word: Word;
  speed: number;
  notify: (s: string) => void;
}) {
  return (
    <div className="word-examples">
      {word.examples.length ? (
        word.examples.map((ex, i) => (
          <div key={i}>
            <button
              aria-label={`Послушать пример ${ex.ro}`}
              onClick={() => speak(ex.ro, speed, notify)}
              lang="ro"
            >
              {ex.ro}
              <Volume2 size={13} />
            </button>
            <small>{ex.ru}</small>
            {ex.source && (
              <a
                className="example-source"
                href={ex.source.url}
                target="_blank"
                rel="noreferrer"
              >
                {ex.source.name} · {ex.source.attribution}
              </a>
            )}
          </div>
        ))
      ) : (
        <small className="muted">
          Примеры для этой справочной статьи ещё не подготовлены.
        </small>
      )}
      {word.examples.length === 1 && (
        <small className="muted">Второй пример ещё не подготовлен.</small>
      )}
    </div>
  );
}
function Attribution({ word }: { word: Word }) {
  return (
    <>
      {word.source && (
        <details className="word-attribution">
          <summary>Источник и лицензия текста</summary>
          <a href={word.source.url} target="_blank" rel="noreferrer">
            {word.source.name}
          </a>
          <p>{word.source.attribution}</p>
          <a href={word.source.licenseUrl} target="_blank" rel="noreferrer">
            {word.source.license}
          </a>
        </details>
      )}
      {word.imageSource ? (
        <details className="word-attribution">
          <summary>Фото: автор и лицензия</summary>
          <a href={word.imageSource.url} target="_blank" rel="noreferrer">
            {word.imageSource.name}
          </a>
          <p>{word.imageSource.attribution}</p>
          <a
            href={word.imageSource.licenseUrl}
            target="_blank"
            rel="noreferrer"
          >
            {word.imageSource.license}
          </a>
        </details>
      ) : word.image ? (
        <a
          className="example-source"
          href="/photos/attribution.json"
          target="_blank"
          rel="noreferrer"
        >
          Фотография: источник и лицензия
        </a>
      ) : null}
    </>
  );
}

function WordQuality({word}:{word:Word}){return <>{word.editorial?.examplesReviewed&&<p className="word-review-note">Примеры просмотрены редактором-агентом. Независимая проверка носителем не выполнена.</p>}{!!word.reviewFlags?.length&&<details className="word-attribution quality-details"><summary>Проверка качества · {word.reviewFlags.length} отметок</summary><ul>{word.reviewFlags.map(code=><li key={code}>{qualityLabels[code as QualityCode]||code}</li>)}</ul>{word.editorial?.notes?.map((note,i)=><p key={i}>{note}</p>)}<p>Отметки — причины проверки, а не доказанные языковые ошибки. Сомнительные статьи сохранены под прежними ID.</p></details>}{word.photoReview&&!word.photoReview.visuallyReviewed&&<p className="word-review-note">Фото сопоставлено по двуязычной сущности; визуальная проверка ещё не завершена.</p>}</>}
