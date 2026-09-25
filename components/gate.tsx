"use client";

import Link from "next/link";
import { useLang } from "@/components/lang";
import type { Lang } from "@/lib/copy";

export function Gate({ onGuest }: { onGuest: () => void }) {
  const { lang, setLang, t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] min-[900px]:grid min-[900px]:grid-cols-[1.2fr_0.8fr] min-[900px]:items-end min-[900px]:gap-16 min-[900px]:px-12 min-[900px]:py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
        <h1 className="mt-6 max-w-xl font-serif text-5xl leading-[1.02] min-[900px]:text-7xl">
          {t("gateTitle")}
        </h1>
        <p className="mt-6 max-w-md text-lg leading-snug">{t("gateBody")}</p>
      </div>
      <div className="mt-12 grid gap-3 min-[900px]:mt-0">
        <div className="mb-2 flex gap-2">
          {(["de", "en", "es", "fr"] as Lang[]).map((code) => (
            <button key={code} type="button" className={`min-h-10 px-2 text-sm ${lang === code ? "border-b border-ink" : ""}`} onClick={() => setLang(code)}>
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <Link href="/sign-in" className="flex min-h-14 items-center justify-center bg-ink text-paper">
          {t("signIn")}
        </Link>
        <Link href="/sign-up" className="flex min-h-14 items-center justify-center ring-1 ring-ink/25">
          {t("signUp")}
        </Link>
        <button type="button" className="min-h-14" onClick={onGuest}>
          {t("guest")}
        </button>
      </div>
    </main>
  );
}
