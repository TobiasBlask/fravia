# Fravia

Fravia plant deine Woche im Einklang mit deinem Zyklus. Sie sagt zuerst, welche Tage tragen, und du antwortest mit einem Satz: Sport diese Woche, eine Feier in zwei Wochen, oder ein festes Datum. Sie schlägt den Tag vor und legt ihn erst nach deinem Ja in den Kalender. Die vier Lebensphasen ändern den Rat, nicht die Stimme: Im Rhythmus, Auf der Pille, Mit Schmerz, Wechseljahre. Der Monat, der Check-in und die Personas bleiben.

Deutsch ist die Sprache, mit der ich dich anspreche. Englisch, Spanisch und Französisch stellst du in den Einstellungen um.

## Lokal starten

```bash
npm install
npx convex dev
npm run dev
```

Lege eine `.env.local` an. Die Namen stehen in `.env.example`. Keine Werte ins Repository.

`npm run build` erzeugt die Produktion, `npm start` startet sie (`next start`).

## Variablen

In der Next-App:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` (`/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (`/sign-up`)

Auf dem Convex-Deployment:

- `CLERK_FRONTEND_API_URL` (Clerk-Issuer, `applicationID` ist `convex`)

Nur für das Deploy, nicht zur Laufzeit der App:

- `CONVEX_DEPLOY_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (optional, für Erinnerungen; ohne Schlüssel bleibt der Versand aus)

```bash
npx convex env set CLERK_FRONTEND_API_URL <issuer>
npx convex deploy
```

Für eine stabile Preview: `CONVEX_PREVIEW_NAME=fravia`.
