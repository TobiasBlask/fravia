"use client";

import { useState } from "react";
import { useLang } from "@/components/lang";
import type { useJournal } from "@/components/use-journal";
import { hear } from "@/lib/speech";
import type { DayLog } from "@/lib/types";

type SpeechResult = { results: ArrayLike<{ 0: { transcript: string } }> };
type SpeechRec = {
  lang: string;
  onresult: ((event: SpeechResult) => void) | null;
  start: () => void;
};

export function VoiceBox({
  date,
  existing,
  journal,
}: {
  date: string;
  existing?: DayLog;
  journal: ReturnType<typeof useJournal>;
}) {
  const { lang, t } = useLang();
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const speechLang = lang === "de" ? "de-DE" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : "en-GB";

  function listen() {
    const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Ctor) {
      setHint(t("voiceHint"));
      return;
    }
    const rec = new Ctor();
    rec.lang = speechLang;
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      setText(said);
      setListening(false);
    };
    setListening(true);
    rec.start();
  }

  async function send() {
    if (!text.trim() || !journal.profile) return;
    const parsed = hear(text, journal.profile.persona);
    const remote = await journal.hear(text);
    if (remote.mode === "local") setHint(t("voiceLocal"));
    const next: DayLog = {
      date,
      bleeding: parsed.log.bleeding ?? existing?.bleeding ?? "none",
      note: parsed.log.note ?? existing?.note ?? "",
      energy: parsed.log.energy ?? existing?.energy,
      pain: parsed.log.pain ?? existing?.pain,
      mood: existing?.mood,
      heat: parsed.log.heat ?? existing?.heat,
      sleep: parsed.log.sleep ?? existing?.sleep,
      symptoms: parsed.log.symptoms ?? existing?.symptoms,
      ovulation: journal.profile.persona === "rhythm" ? (parsed.log.ovulation ?? existing?.ovulation) : undefined,
    };
    await journal.saveDay(next);
    if (parsed.event) {
      await journal.addEvent({ title: parsed.event.title, kind: parsed.event.kind, date, freq: parsed.event.kind === "geburtstag" ? "yearly" : "none" });
    }
    if (parsed.todo) await journal.addTodo({ title: parsed.todo, date, freq: "none" });
    setText("");
  }

  return (
    <section className="mt-8">
      <p className="text-[11px] uppercase tracking-[0.16em]">{t("voice")}</p>
      <p className="mt-2 text-sm">{listening ? t("listening") : t("voiceHint")}</p>
      <textarea
        value={text}
        rows={3}
        onChange={(event) => setText(event.target.value)}
        className="mt-3 w-full resize-none border-b border-ink/30 bg-transparent py-2"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-12 ring-1 ring-ink/20" onClick={listen}>{t("voice")}</button>
        <button type="button" className="min-h-12 bg-ink text-paper" onClick={() => void send()}>{t("save")}</button>
      </div>
      {hint ? <p className="mt-2 text-sm">{hint}</p> : null}
    </section>
  );
}
