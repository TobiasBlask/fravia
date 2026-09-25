"use client";

import Link from "next/link";
import { useLang } from "@/components/lang";

export default function NotFound() {
  const { t } = useLang();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-between px-5 py-10">
      <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
      <h1 className="font-serif text-5xl">{t("notFound")}</h1>
      <Link href="/" className="inline-flex min-h-14 items-center">{t("home")}</Link>
    </main>
  );
}
