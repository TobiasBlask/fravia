"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/components/lang";
import type { useJournal } from "@/components/use-journal";
import { parseCycleImport, parseIcs } from "@/lib/ics";
import type { Lang } from "@/lib/copy";
import { iso } from "@/lib/dates";

export function SettingsView({ journal }: { journal: ReturnType<typeof useJournal> }) {
  const { lang, setLang, t } = useLang();
  const profile = journal.profile;
  const [name, setName] = useState(profile?.displayName ?? "");
  const [diet, setDiet] = useState(profile?.diet ?? "");
  const [movement, setMovement] = useState(profile?.movement ?? "");
  const [referral, setReferral] = useState(profile?.referral ?? "");
  const [message, setMessage] = useState("");
  const [thanks, setThanks] = useState(false);
  const [feed, setFeed] = useState<string | null>(profile?.feedToken ?? null);
  const [hidePhase, setHidePhase] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [install, setInstall] = useState<(() => void) | null>(null);
  const [update, setUpdate] = useState(false);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      const deferred = event as Event & { prompt: () => void };
      setInstall(() => () => deferred.prompt());
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg.waiting) setUpdate(true);
      }).catch(() => undefined);
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const energy = useMemo(() => {
    const days = [];
    const start = new Date();
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() - i);
      const log = journal.logs[iso(date)];
      days.push(log?.energy ?? 0);
    }
    return days;
  }, [journal.logs]);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(t("copied"));
  }

  async function enablePush() {
    if (!vapid) {
      setPushNote(t("pushGap"));
      localStorage.setItem("fravia-wants-push", "1");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushNote(t("pushGap"));
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
    const json = sub.toJSON();
    await journal.savePush(sub.endpoint, JSON.stringify(json.keys ?? {}));
    setPushNote(t("pushReady"));
  }

  if (!profile) return null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <Link href="/" className="inline-flex min-h-12 items-center text-sm">{t("home")}</Link>
      <h1 className="mt-4 font-serif text-5xl">{t("settings")}</h1>
      <p className="mt-4 max-w-lg text-base leading-snug">{t("help")}</p>

      <section className="mt-10">
        <h2 className="text-[11px] uppercase tracking-[0.16em]">{t("language")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["de", "en", "es", "fr"] as Lang[]).map((code) => (
            <button key={code} type="button" onClick={() => setLang(code)} className={`min-h-12 px-4 ${lang === code ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4">
        <h2 className="text-[11px] uppercase tracking-[0.16em]">{t("name")}</h2>
        <input value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent font-serif text-3xl" />
        <button type="button" className="min-h-12 bg-ink text-paper" onClick={() => journal.patchDetails({ displayName: name })}>{t("save")}</button>
        {!journal.guestMode ? (
          <div>
            <p className="mb-2 text-sm">{t("password")}</p>
            <UserButton />
          </div>
        ) : null}
        <button type="button" className="min-h-12 text-left" onClick={() => journal.setRevising(true)}>{t("revise")}</button>
        {profile.persona === "rhythm" ? (
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" checked={Boolean(profile.irregular)} onChange={(event) => journal.patchDetails({ irregular: event.target.checked })} />
            {t("irregular")}
          </label>
        ) : null}
        {profile.persona === "pain" ? (
          <fieldset>
            <legend className="text-sm">{t("endo")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["none", "suspected", "diagnosed"] as const).map((value) => (
                <button key={value} type="button" onClick={() => journal.patchDetails({ endo: value })} className={`min-h-12 px-3 ${profile.endo === value ? "bg-ink text-paper" : "ring-1 ring-ink/20"}`}>
                  {value === "none" ? t("endoNone") : value === "suspected" ? t("endoSuspected") : t("endoDiagnosed")}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] uppercase tracking-[0.16em]">{t("energyRecent")}</h2>
        {energy.every((value) => value === 0) ? <p className="mt-3 text-sm">{t("emptyEnergy")}</p> : (
          <div className="mt-4 flex h-24 items-end gap-1" aria-label={t("energyRecent")}>
            {energy.map((value, index) => (
              <span key={index} className="flex-1 bg-ink/70" style={{ height: `${value ? value * 20 : 4}%` }} />
            ))}
          </div>
        )}
        <ul className="mt-4 grid gap-1 text-sm">
          {journal.adjustments.map((item) => (
            <li key={item.at}>{item.note}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.16em]">{t("diet")}</h2>
        <p className="text-sm">{t("dietHint")}</p>
        <input value={diet} onChange={(event) => setDiet(event.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <h2 className="mt-4 text-[11px] uppercase tracking-[0.16em]">{t("movementProfile")}</h2>
        <input value={movement} onChange={(event) => setMovement(event.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <h2 className="mt-4 text-[11px] uppercase tracking-[0.16em]">{t("referral")}</h2>
        <input value={referral} onChange={(event) => setReferral(event.target.value)} className="min-h-12 border-b border-ink/30 bg-transparent" />
        <button type="button" className="min-h-12 ring-1 ring-ink/25" onClick={() => journal.patchDetails({ diet, movement, referral })}>{t("save")}</button>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.16em]">{t("share")}</h2>
        {journal.guestMode ? <p>{t("shareNeeds")}</p> : (
          <>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={hidePhase} onChange={(event) => setHidePhase(event.target.checked)} />
              {t("shareHide")}
            </label>
            <button
              type="button"
              className="min-h-12 bg-ink text-paper"
              onClick={async () => {
                const token = await journal.createShare(hidePhase);
                if (token) await copy(`${location.origin}/share/${token}`);
              }}
            >
              {t("shareCopy")}
            </button>
            {journal.shares.length === 0 ? <p className="text-sm">{t("shareEmpty")}</p> : (
              <ul className="grid gap-2 text-sm">
                {journal.shares.map((share) => (
                  <li key={share.token}>
                    <button type="button" onClick={() => copy(`${location.origin}/share/${share.token}`)}>
                      {share.status} · {share.token.slice(0, 8)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {!journal.guestMode ? (
          <button
            type="button"
            className="min-h-12 text-left"
            onClick={async () => {
              const token = feed ?? (await journal.ensureFeed());
              if (!token) return;
              setFeed(token);
              await copy(`${location.origin}/api/feed/${token}`);
            }}
          >
            {t("feedCopy")}
          </button>
        ) : null}
        <p className="text-sm">{t("feedHint")}</p>
        {copied ? <p className="text-sm">{copied}</p> : null}
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.16em]">{t("push")}</h2>
        <p className="text-sm">{vapid ? t("pushReady") : t("pushGap")}</p>
        <button type="button" className="min-h-12 bg-ink text-paper" onClick={() => void enablePush()}>{t("pushOn")}</button>
        <button type="button" className="min-h-12 ring-1 ring-ink/25" onClick={() => void journal.clearPush()}>{t("pushOff")}</button>
        {pushNote ? <p className="text-sm">{pushNote}</p> : null}
      </section>

      <section className="mt-10 grid gap-3">
        <label className="block text-sm">
          {t("importIcs")}
          <input
            type="file"
            accept=".ics,text/calendar"
            className="mt-2 block"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const parsed = parseIcs(await file.text());
              for (const item of parsed) {
                await journal.addEvent({ title: item.title, kind: "termin", date: item.date, freq: "none", ...(item.time ? { time: item.time } : {}), ...(item.end ? { end: item.end } : {}), ...(item.location ? { location: item.location } : {}), ...(item.note ? { note: item.note } : {}) });
              }
              if (parsed[0]) journal.setFocus(parsed[0].date);
            }}
          />
        </label>
        <label className="block text-sm">
          {t("importCycle")}
          <textarea
            className="mt-2 w-full border-b border-ink/30 bg-transparent"
            rows={3}
            onBlur={async (event) => {
              if (!event.target.value.trim() || !profile) return;
              const parsed = parseCycleImport(event.target.value);
              if (!parsed?.lastPeriodStart) return;
              await journal.saveProfile({
                ...profile,
                lastPeriodStart: parsed.lastPeriodStart,
                ...(parsed.cycleLength ? { cycleLength: parsed.cycleLength } : {}),
                ...(parsed.periodLength ? { periodLength: parsed.periodLength } : {}),
                ...(parsed.lutealLength ? { lutealLength: parsed.lutealLength } : {}),
              });
              journal.setFocus(parsed.lastPeriodStart);
            }}
          />
        </label>
      </section>

      <section className="mt-10 grid gap-3">
        <h2 className="font-serif text-3xl">{t("feedback")}</h2>
        <p className="text-sm">{t("feedbackHint")}</p>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="border-b border-ink/30 bg-transparent" />
        <button
          type="button"
          className="min-h-12 bg-ink text-paper"
          onClick={async () => {
            await journal.saveFeedback(message, "app");
            setMessage("");
            setThanks(true);
          }}
        >
          {t("feedbackSend")}
        </button>
        {thanks ? <p>{t("feedbackThanks")}</p> : null}
      </section>

      {install ? <button type="button" className="mt-10 min-h-12" onClick={install}>{t("install")}</button> : <p className="mt-10 text-sm">{t("installIos")}</p>}
      {update ? <button type="button" className="mt-4 min-h-12" onClick={() => location.reload()}>{t("update")}</button> : null}

      <nav className="mt-10 flex gap-6 text-sm">
        <Link href="/datenschutz">{t("privacy")}</Link>
        <Link href="/impressum">{t("imprint")}</Link>
      </nav>

      {journal.guestMode ? (
        <button type="button" className="mt-10 min-h-12" onClick={journal.wipeGuest}>{t("guestClear")}</button>
      ) : (
        <section className="mt-12">
          {!confirmDelete ? (
            <button type="button" className="min-h-12" onClick={() => setConfirmDelete(true)}>{t("deleteAsk")}</button>
          ) : (
            <div className="grid gap-3">
              <p>{t("deleteBody")}</p>
              <button
                type="button"
                className="min-h-12 bg-ink text-paper"
                onClick={async () => {
                  await fetch("/api/account", { method: "POST" });
                  location.href = "/";
                }}
              >
                {t("deleteYes")}
              </button>
              <button type="button" className="min-h-12" onClick={() => setConfirmDelete(false)}>{t("deleteNo")}</button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}
