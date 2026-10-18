import { useSyncExternalStore, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Volume2,
  Headphones,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  subscribeAudio,
  getAudioState,
  pauseAudio,
  resumeAudio,
  repeatAudio,
  stopAudio,
  setAudioRate,
  setAudioVolume,
  speak,
  audioFileFor,
  audioFileCount,
} from "../lib/audio";
import AudioDeliveryCheck from "./AudioDeliveryCheck";
import AudioPlaybackCheck from "./AudioPlaybackCheck";
import { checkAudioDelivery, type MediaCheck } from "../lib/media-check";
const labels = {
  idle: "Остановлено",
  loading: "Загрузка аудио…",
  playing: "Воспроизведение",
  paused: "Пауза",
  ended: "Завершено",
  error: "Ошибка аудио",
};
export function AudioBar({
  notify,
  onRateChange,
  inline = false,
}: {
  notify: (s: string) => void;
  onRateChange?: (rate: number) => void;
  inline?: boolean;
}) {
  const state = useSyncExternalStore(
    subscribeAudio,
    getAudioState,
    getAudioState,
  );
  if (!state.text || (state.status === "idle" && !state.error)) return null;
  return (
    <section
      className={inline ? "audio-dock audio-inline" : "audio-dock"}
      aria-label="Управление озвучкой"
    >
      <Volume2 size={20} />
      <div className="audio-dock-title">
        <strong lang="ro">{state.text}</strong>
        <span role="status">
          {labels[state.status]} ·{" "}
          {state.source === "file"
            ? "Локальный румынский файл"
            : state.source === "server"
              ? "Румынский Piper/Mihai"
            : state.source === "browser"
              ? "Системный ro-RO"
              : "Румынское аудио"}
          {state.duration > 0 &&
            ` · ${Math.round(state.currentTime)}/${Math.round(state.duration)} с`}
        </span>
        {state.error && <small>{state.error}</small>}
      </div>
      <button
        className="icon-btn"
        disabled={state.status === "loading"}
        aria-label={
          state.status === "playing" ? "Пауза аудио" : "Продолжить аудио"
        }
        onClick={() =>
          state.status === "playing"
            ? pauseAudio()
            : state.status === "paused"
              ? resumeAudio(notify)
              : repeatAudio(notify)
        }
      >
        {state.status === "playing" ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <button
        className="icon-btn"
        aria-label="Повторить аудио"
        onClick={() => repeatAudio(notify)}
      >
        <RotateCcw size={19} />
      </button>
      <select
        value={state.rate}
        aria-label="Скорость аудиоплеера"
        onChange={(e) => {
          const rate = Number(e.target.value);
          setAudioRate(rate);
          onRateChange?.(rate);
        }}
      >
        {[0.75, 1, 1.25].map((rate) => (
          <option key={rate} value={rate}>
            {rate}×
          </option>
        ))}
      </select>
      <label className="audio-volume">Громкость
        <input type="range" aria-label="Громкость аудио" min="0" max="1" step="0.05" value={state.volume} onChange={e => setAudioVolume(Number(e.target.value))} />
      </label>
      <button
        className="icon-btn"
        aria-label="Остановить аудио"
        onClick={() => stopAudio()}
      >
        <X size={18} />
      </button>
    </section>
  );
}
const sample = "Bună ziua! Învăț limba română.";
export function SoundCheck({ speed, notify }: { speed: number; notify: (s: string) => void }) {
  const state = useSyncExternalStore(subscribeAudio, getAudioState, getAudioState);
  const [result, setResult] = useState<MediaCheck | null>(null);
  const [started, setStarted] = useState(false);
  return <div className="sound-check">
    <button className="secondary" onClick={() => {
      setStarted(true);
      setResult(null);
      // Start MP3 synchronously: waiting for fetch first loses mobile activation.
      speak(sample, speed, notify, "file");
      void checkAudioDelivery("Проверка звука", sample).then(setResult);
    }}><Volume2 size={18} /> Проверить звук</button>
    {started && state.text === sample && <p role={state.status === "error" || result?.ok === false ? "alert" : "status"}>
      {state.error || (result?.ok === false ? result.error : labels[state.status])}
      {result && <small> · {result.status ? `HTTP ${result.status}` : "HTTP не получен"} · {result.url}</small>}
      {state.status === "ended" && " · MP3 завершён. Слышимость проверьте на устройстве."}
    </p>}
  </div>;
}
export function AudioDiagnostics({
  notify,
  speed,
}: {
  notify: (s: string) => void;
  speed: number;
}) {
  const state = useSyncExternalStore(
    subscribeAudio,
    getAudioState,
    getAudioState,
  );
  const [confirmed, setConfirmed] = useState(false);
  return (
    <section className="panel settings-panel audio-diagnostics">
      <h3>
        <Headphones size={22} /> Проверка и диагностика звука
      </h3>
      <p>
        Нажмите кнопку и проверьте звук на вашем устройстве. Событие
        воспроизведения не подтверждает слышимость: проверьте громкость,
        Bluetooth и беззвучный режим. Физический звук в среде разработки не
        проверен.
      </p>
      <div className="diagnostic-grid">
        <div>
          <span>Системный голос</span>
          <strong>
            {state.voices.length
              ? state.voices.join(", ")
              : "Румынский голос пока не обнаружен"}
          </strong>
        </div>
        <div>
          <span>Локальная библиотека</span>
          <strong>
            {audioFileCount.toLocaleString("ru")} румынских аудиофайлов
          </strong>
        </div>
        <div>
          <span>Состояние</span>
          <strong>{labels[state.status]}</strong>
        </div>
        <div>
          <span>Источник</span>
          <strong>
            {state.source === "file"
              ? "Файл Piper/Mihai · ro-RO"
              : state.source === "server"
                ? "Piper/Mihai · ro-RO · endpoint/кеш"
              : state.source === "browser"
                ? "SpeechSynthesis · ro-RO"
                : "Ещё не выбран"}
          </strong>
        </div>
      </div>
      <p lang="ro" className="diagnostic-sample">
        {sample}
      </p>
      <div className="button-row">
        <button
          className="primary"
          onClick={() => {
            setConfirmed(false);
            speak(sample, speed, notify, "file");
          }}
        >
          <Volume2 size={18} /> Проверить звук
        </button>
        <button
          className="secondary"
          onClick={() => {
            setConfirmed(false);
            speak(sample, speed, notify, "file");
          }}
        >
          <Play size={18} /> Проверить резервный файл
        </button>
      </div>
      {audioFileFor(sample) && (
        <a
          className="text-button"
          href={audioFileFor(sample)}
          download="romana-nova-ro-test.mp3"
        >
          Скачать тестовый MP3 для отдельной проверки
        </a>
      )}
      <p className="muted">
        Если аудио зависло после блокировки: нажмите повтор. Проигрыватель общий
        для всех разделов. Запуск происходит только по
        вашему нажатию.
      </p>
      <button
        className={`secondary ${confirmed ? "confirmed-audio" : ""}`}
        onClick={() => setConfirmed(true)}
      >
        <CheckCircle2 size={18} />
        {confirmed
          ? "Вы подтвердили: румынскую речь слышно"
          : "Я слышу румынскую речь"}
      </button>
      {state.error && (
        <p className="diagnostic-error" role="alert">
          <AlertCircle size={17} />
          {state.error}
        </p>
      )}
      <AudioDeliveryCheck speed={speed} notify={notify}/>
      <AudioPlaybackCheck speed={speed} notify={notify}/>
      <details>
        <summary>Технические сведения устройства</summary>
        <p>
          SpeechSynthesis:{" "}
          {typeof window !== "undefined" && "speechSynthesis" in window
            ? "доступен"
            : "недоступен"}
          . MP3:{" "}
          {typeof document !== "undefined"
            ? document.createElement("audio").canPlayType("audio/mpeg") ||
              "нет поддержки"
            : "не проверен"}
          . Сеть: {navigator.onLine ? "онлайн" : "офлайн"}.
        </p>
        <p className="muted">{navigator.userAgent}</p>
        <p>
          Резерв: локальные MP3, синтезированные голосом Piper/Mihai (Romanian,
          Romania).{" "}
          <a
            href="/licenses/ro_RO-mihai-MODEL_CARD.txt"
            target="_blank"
            rel="noreferrer"
          >
            Модель и лицензия
          </a>
          . Это синтезированная речь, не записи диктора.
        </p>
      </details>
    </section>
  );
}
