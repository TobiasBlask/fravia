"use client";

import Link from "next/link";
import { useLang } from "@/components/lang";
import type { Lang } from "@/lib/copy";

export function Gate({ onGuest }: { onGuest: () => void }) {
  const { lang, setLang, t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <p className="font-serif text-4xl leading-none">Fravia</p>
      <h1 className="mt-10 font-serif text-4xl leading-tight min-[900px]:text-5xl">{t("gateTitle")}</h1>
      <div className="mt-10 flex gap-2">
        {(["de", "en", "es", "fr"] as Lang[]).map((code) => (
          <button key={code} type="button" className={`min-h-11 px-2 text-sm ${lang === code ? "border-b border-ink" : ""}`} onClick={() => setLang(code)}>
            {code.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mt-8 grid">
        <Link href="/sign-in" className="flex min-h-14 items-center bg-ink px-4 text-paper">
          {t("signIn")}
        </Link>
        <Link href="/sign-up" className="flex min-h-14 items-center px-4">
          {t("signUp")}
        </Link>
        <button type="button" className="min-h-14 px-4 text-left" onClick={onGuest}>
          {t("guest")}
        </button>
      </div>
    </main>
  );
}
