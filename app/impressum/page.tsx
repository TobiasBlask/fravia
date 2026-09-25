"use client";

import Link from "next/link";
import { useLang } from "@/components/lang";

export default function ImprintPage() {
  const { lang, t } = useLang();
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-10">
      <Link href="/" className="inline-flex min-h-12 items-center text-sm">{t("home")}</Link>
      <h1 className="mt-6 font-serif text-5xl">{t("imprint")}</h1>
      {TEXT[lang].map((paragraph) => (
        <p key={paragraph} className="mt-4 text-base leading-relaxed">{paragraph}</p>
      ))}
    </main>
  );
}

const TEXT = {
  de: [
    "Fravia ist ein Kalender für erwachsene Tage: Zyklus, Termine, Essen, Bewegung.",
    "Für diese Fassung liegt keine ladungsfähige Anschrift im Produkt. Wenn etwas nicht stimmt, schreib es über das Formular in den Einstellungen.",
    "Ich ersetze keine ärztliche Beratung, keine Diagnose und keinen Notdienst.",
  ],
  en: [
    "Fravia is a calendar for adult days: cycle, appointments, food, movement.",
    "This copy does not publish a service address. If something is wrong, use the form in settings.",
    "I don't replace medical advice, a diagnosis, or an emergency service.",
  ],
  es: [
    "Fravia es un calendario para días adultos: ciclo, citas, comida, movimiento.",
    "Esta copia no publica un domicilio. Si algo no cuadra, usa el formulario de ajustes.",
    "No sustituyo un consejo médico, un diagnóstico ni un servicio de urgencias.",
  ],
  fr: [
    "Fravia est un calendrier pour des jours adultes : cycle, rendez-vous, repas, mouvement.",
    "Cette copie ne publie pas d'adresse. Si quelque chose cloche, le formulaire des réglages est là.",
    "Je ne remplace ni un avis médical, ni un diagnostic, ni les urgences.",
  ],
};
