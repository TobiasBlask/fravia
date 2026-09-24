"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Gate } from "@/components/gate";
import { Home } from "@/components/home";
import { Onboarding } from "@/components/onboarding";
import { Wash } from "@/components/wash";
import { iso, startOfMonth } from "@/lib/dates";
import type { DayLog, Profile } from "@/lib/types";

export function FraviaApp() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const ensureUser = useMutation(api.users.ensureUser);
  const saveProfile = useMutation(api.journal.saveProfile);
  const saveDay = useMutation(api.journal.saveDay);
  const viewer = useQuery(api.journal.viewer, isAuthenticated ? {} : "skip");
  const ensured = useRef(false);
  const [failed, setFailed] = useState(false);
  const [revising, setRevising] = useState(false);
  const [optimistic, setOptimistic] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [localLogs, setLocalLogs] = useState<Record<string, DayLog>>({});
  const today = useMemo(() => new Date(), []);
  const month = startOfMonth(today);
  const rangeStart = iso(new Date(month.getFullYear(), month.getMonth() - 6, 1));
  const rangeEnd = iso(new Date(month.getFullYear(), month.getMonth() + 7, 0));
  const remoteLogs = useQuery(
    api.journal.daysInRange,
    isAuthenticated && (viewer?.state === "ready" || optimistic)
      ? { start: rangeStart, end: rangeEnd }
      : "skip",
  );

  useEffect(() => {
    if (!isAuthenticated) {
      ensured.current = false;
      return;
    }
    if (ensured.current) return;
    ensured.current = true;
    ensureUser().catch(() => {
      ensured.current = false;
      setFailed(true);
    });
  }, [ensureUser, isAuthenticated]);

  const profile: Profile | null =
    optimistic ??
    (viewer?.state === "ready"
      ? {
          persona: viewer.profile.persona,
          lastPeriodStart: viewer.profile.lastPeriodStart,
          cycleLength: viewer.profile.cycleLength,
          periodLength: viewer.profile.periodLength,
          lutealLength: viewer.profile.lutealLength,
          packLength: viewer.profile.packLength,
        }
      : null);

  const logs = useMemo(() => {
    const merged: Record<string, DayLog> = {};
    for (const log of remoteLogs ?? []) {
      merged[log.date] = {
        date: log.date,
        bleeding: log.bleeding,
        energy: log.energy,
        note: log.note,
        pain: log.pain,
        mood: log.mood,
        heat: log.heat,
        sleep: log.sleep,
      };
    }
    return { ...merged, ...localLogs };
  }, [localLogs, remoteLogs]);

  async function onSave(next: Profile) {
    setSaving(true);
    setFormError(null);
    try {
      await saveProfile(next);
      setOptimistic(next);
      setRevising(false);
    } catch {
      setFormError("Das hat nicht geklappt. Noch einmal.");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveDay(log: DayLog) {
    setSaving(true);
    setLocalLogs((current) => ({ ...current, [log.date]: log }));
    try {
      await saveDay(log);
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || (isSignedIn && (isLoading || viewer === undefined || viewer.state === "pending"))) {
    return <Status line="Der Kalender kommt." />;
  }

  if (!isSignedIn) return <Gate />;

  if (failed || (!isLoading && !isAuthenticated) || !viewer || viewer.state === "signed-out") {
    return (
      <Status
        line="Die Anmeldung ist da, der Kalender erkennt sie noch nicht."
        action="Noch einmal"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (revising || !profile) {
    return (
      <Onboarding
        initial={profile}
        allowCancel={revising}
        busy={saving}
        error={formError}
        onCancel={() => setRevising(false)}
        onSave={onSave}
      />
    );
  }

  return (
    <Home
      profile={profile}
      logs={logs}
      busy={saving}
      onRevise={() => setRevising(true)}
      onSaveDay={onSaveDay}
    />
  );
}

function Status({
  line,
  action,
  onAction,
}: {
  line: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Wash color="#5c5270" />
      <p className="text-xs uppercase tracking-[0.18em]">Fravia</p>
      <h1 className="max-w-md font-serif text-4xl leading-tight">{line}</h1>
      {action ? (
        <button type="button" className="min-h-14 bg-ink text-paper" onClick={onAction}>
          {action}
        </button>
      ) : (
        <span />
      )}
    </main>
  );
}
