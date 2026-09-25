"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/components/lang";
import { api } from "@/convex/_generated/api";

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { isSignedIn } = useAuth();
  const { t } = useLang();
  const state = useQuery(api.life.shareState, { token });
  const accept = useMutation(api.life.acceptShare);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-between px-5 py-10">
      <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
      <div>
        <h1 className="font-serif text-5xl">{t("share")}</h1>
        <p className="mt-4 text-lg">
          {done ? t("shareDone") : state?.state === "missing" ? t("shareMissing") : t("shareSign")}
        </p>
        {error ? <p className="mt-3">{t("error")}</p> : null}
      </div>
      <div className="grid gap-3">
        {isSignedIn && !done && state?.state !== "missing" ? (
          <button
            type="button"
            className="min-h-14 bg-ink text-paper"
            onClick={async () => {
              try {
                const ok = await accept({ token });
                setDone(Boolean(ok) || state?.state === "accepted");
                if (!ok && state?.state !== "accepted") setError(true);
                else setDone(true);
              } catch {
                setError(true);
              }
            }}
          >
            {t("shareAccept")}
          </button>
        ) : (
          <Link href={`/sign-in?redirect_url=/share/${token}`} className="flex min-h-14 items-center justify-center bg-ink text-paper">
            {t("signIn")}
          </Link>
        )}
        <Link href="/" className="flex min-h-12 items-center">{t("home")}</Link>
      </div>
    </main>
  );
}
