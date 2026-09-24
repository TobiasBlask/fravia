import Link from "next/link";

export function Gate() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1400px] flex-col justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] min-[900px]:grid min-[900px]:grid-cols-[1.2fr_0.8fr] min-[900px]:items-end min-[900px]:gap-16 min-[900px]:px-12 min-[900px]:py-16">
      <div>
        <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
        <h1 className="mt-6 max-w-xl font-serif text-5xl leading-[1.02] min-[900px]:text-7xl">
          Der Tag wird nach dir geschnitten.
        </h1>
        <p className="mt-6 max-w-md text-lg leading-snug">
          Kein rosa Tagebuch. Keine Akte. Ein Kalender für erwachsene Tage.
        </p>
      </div>
      <div className="mt-12 grid gap-3 min-[900px]:mt-0">
        <Link
          href="/sign-in"
          className="flex min-h-14 items-center justify-center bg-ink text-paper"
        >
          Anmelden
        </Link>
        <Link
          href="/sign-up"
          className="flex min-h-14 items-center justify-center ring-1 ring-ink/25"
        >
          Konto anlegen
        </Link>
      </div>
    </main>
  );
}
