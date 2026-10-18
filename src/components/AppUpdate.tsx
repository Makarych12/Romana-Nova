import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export default function AppUpdate({ beforeUpdate, notify }: {
  beforeUpdate: () => Promise<void>;
  notify: (message: string) => void;
}) {
  const [available, setAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  useEffect(() => {
    update.current = registerSW({
      immediate: true,
      onNeedRefresh: () => setAvailable(true),
      onRegisterError: () => notify("Офлайн-режим не подключён. Онлайн-озвучка остаётся доступной."),
    });
  }, [notify]);
  if (!available) return null;
  return <div className="content-notice" role="status">
    <p>Доступно обновление приложения.</p>
    <button className="secondary" disabled={saving} onClick={async () => {
      setSaving(true);
      try {
        await beforeUpdate();
        await update.current?.(true);
      } catch {
        notify("Обновление отложено: не удалось сохранить прогресс. Сделайте экспорт в настройках.");
        setSaving(false);
      }
    }}>{saving ? "Сохраняем прогресс…" : "Сохранить прогресс и обновить"}</button>
  </div>;
}
