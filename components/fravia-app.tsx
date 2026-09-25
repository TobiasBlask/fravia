"use client";

import { Gate } from "@/components/gate";
import { Home } from "@/components/home";
import { useLang } from "@/components/lang";
import { Onboarding } from "@/components/onboarding";
import { SettingsView } from "@/components/settings-view";
import { useJournal } from "@/components/use-journal";
import { Wash } from "@/components/wash";

export function FraviaApp({ surface = "home" }: { surface?: "home" | "settings" }) {
  const journal = useJournal();
  const { t } = useLang();

  if (journal.status === "loading") return <Status line={t("loading")} />;
  if (journal.status === "gate") return <Gate onGuest={journal.enterGuest} />;
  if (journal.status === "failed") {
    return <Status line={t("authFail")} action={t("retry")} onAction={() => window.location.reload()} />;
  }
  if (journal.status === "onboarding" || !journal.profile) {
    return (
      <Onboarding
        initial={journal.profile}
        allowCancel={Boolean(journal.profile)}
        busy={journal.busy}
        error={journal.error ? t("error") : null}
        onCancel={() => journal.setRevising(false)}
        onSave={journal.saveProfile}
      />
    );
  }
  if (surface === "settings") return <SettingsView journal={journal} />;
  return <Home journal={journal} />;
}

function Status({ line, action, onAction }: { line: string; action?: string; onAction?: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Wash color="#5c5270" />
      <p className="font-serif text-3xl leading-none">Fravia</p>
      <h1 className="max-w-md font-serif text-4xl leading-tight">{line}</h1>
      {action ? (
        <button type="button" className="min-h-14 bg-ink text-paper" onClick={onAction}>{action}</button>
      ) : (
        <span />
      )}
    </main>
  );
}
