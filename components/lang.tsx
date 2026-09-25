"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { phrase, type CopyKey, type Lang } from "@/lib/copy";
import type { Stance } from "@/lib/voice";
import { stanceIn } from "@/lib/stance-locale";

const KEY = "fravia-lang";

const LangContext = createContext<{
  lang: Lang;
  t: (key: CopyKey) => string;
  setLang: (lang: Lang) => void;
  say: (stance: Stance) => Stance;
} | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "en" || stored === "es" || stored === "fr" || stored === "de") {
      setLangState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      t: (key: CopyKey) => phrase(lang, key),
      setLang: (next: Lang) => {
        localStorage.setItem(KEY, next);
        setLangState(next);
      },
      say: (stance: Stance) => stanceIn(lang, stance),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) {
    return {
      lang: "de" as Lang,
      t: (key: CopyKey) => phrase("de", key),
      setLang: () => undefined,
      say: (stance: Stance) => stance,
    };
  }
  return value;
}
