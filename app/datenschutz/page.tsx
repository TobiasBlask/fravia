"use client";

import Link from "next/link";
import { useLang } from "@/components/lang";

export default function PrivacyPage() {
  const { lang, t } = useLang();
  const body = TEXT[lang];
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-10">
      <Link href="/" className="inline-flex min-h-12 items-center text-sm">{t("home")}</Link>
      <h1 className="mt-6 font-serif text-5xl">{t("privacy")}</h1>
      {body.map((paragraph) => (
        <p key={paragraph} className="mt-4 text-base leading-relaxed">{paragraph}</p>
      ))}
    </main>
  );
}

const TEXT = {
  de: [
    "Deine Daten gehören dir. Ich speichere Zyklus, Tagesnotizen, Termine und Aufgaben in deinem Konto. Im Gast-Modus bleiben sie nur auf diesem Gerät.",
    "Die Anmeldung läuft über Clerk. Der Kalender liegt bei Convex. Diese Fassung läuft auf Railway.",
    "Wenn du einen Kalender teilst, sieht die Person, die annimmt, deine Termine. Phasen gibst du nur mit, wenn du das nicht abwählst.",
    "Das Kalender-Abo ist ein geheimer Link. Wer ihn hat, sieht die Termine, nicht dein Konto.",
    "Erinnerungen speichere ich nur, wenn du sie einschaltest. Ein Sprachdienst ist nicht verbunden: was du sprichst, bleibt im Browser, bis du es ablegst.",
    "Ich verkaufe nichts und schalte keine Werbung. Du kannst das Profil in den Einstellungen löschen. Ich ersetze keine Ärztin und keinen Notdienst.",
  ],
  en: [
    "Your data is yours. I store cycle, day notes, appointments and tasks in your account. In guest mode they stay on this device.",
    "Sign-in runs through Clerk. The calendar lives in Convex. This copy runs on Railway.",
    "If you share a calendar, the person who accepts sees your appointments. Phases are included only if you leave that on.",
    "The calendar feed is a secret link. Whoever has it sees the appointments, not your account.",
    "I store reminders only if you turn them on. No speech service is connected: what you say stays in the browser until you save it.",
    "I don't sell anything and I don't run ads. You can delete the profile in settings. I don't replace a doctor or an emergency service.",
  ],
  es: [
    "Tus datos son tuyos. Guardo ciclo, notas, citas y tareas en tu cuenta. En modo invitada se quedan en este dispositivo.",
    "La entrada pasa por Clerk. El calendario vive en Convex. Esta copia corre en Railway.",
    "Si compartes el calendario, quien acepta ve tus citas. Las fases solo si tú lo dejas.",
    "El abono del calendario es un enlace secreto. Quien lo tiene ve las citas, no tu cuenta.",
    "Los avisos solo si tú los activas. No hay servicio de voz conectado: lo que dices se queda en el navegador hasta que lo guardas.",
    "No vendo nada ni pongo anuncios. Puedes borrar el perfil en ajustes. No sustituyo a una médica ni a urgencias.",
  ],
  fr: [
    "Tes données t'appartiennent. Je garde cycle, notes, rendez-vous et tâches dans ton compte. En mode invitée, elles restent sur cet appareil.",
    "La connexion passe par Clerk. Le calendrier vit dans Convex. Cette copie tourne sur Railway.",
    "Si tu partages le calendrier, la personne qui accepte voit tes rendez-vous. Les phases seulement si tu le laisses.",
    "Le flux calendrier est un lien secret. Qui l'a voit les rendez-vous, pas ton compte.",
    "Je ne garde un rappel que si tu l'actives. Aucun service vocal n'est relié : ce que tu dis reste dans le navigateur jusqu'à ce que tu l'enregistres.",
    "Je ne vends rien et je ne mets pas de publicité. Tu peux supprimer le profil dans les réglages. Je ne remplace ni une médecin ni les urgences.",
  ],
};
