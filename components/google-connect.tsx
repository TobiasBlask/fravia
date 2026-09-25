"use client";

import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

export function GoogleConnect() {
  const status = useQuery(api.google.status);
  const disconnect = useAction(api.googleApi.disconnect);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("google");
    if (flag === "fehler") setFailed(true);
  }, []);

  if (status?.connected) {
    return (
      <button
        type="button"
        className="min-h-11 text-sm"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void disconnect({}).finally(() => setBusy(false));
        }}
      >
        Google trennen
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3">
      <a
        href="/api/google/start"
        className="inline-flex min-h-11 items-center text-sm"
        onClick={(event) => {
          if (status && !status.configured) event.preventDefault();
        }}
      >
        Mit Google verbinden
      </a>
      {status && !status.configured ? <span className="text-sm">Die Verbindung ist noch nicht eingeschaltet.</span> : null}
      {failed ? <span className="text-sm">Das hat nicht geklappt.</span> : null}
    </span>
  );
}
