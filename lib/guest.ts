import type { DayEvent, DayLog, DayTodo, Profile } from "./types";

const KEY = "fravia-device";

export type GuestStore = {
  profile: Profile | null;
  logs: DayLog[];
  events: DayEvent[];
  todos: DayTodo[];
  feedback: Array<{ message: string; category: string }>;
};

const empty = (): GuestStore => ({
  profile: null,
  logs: [],
  events: [],
  todos: [],
  feedback: [],
});

export function readGuest(): GuestStore {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as GuestStore;
    return {
      profile: parsed.profile ?? null,
      logs: parsed.logs ?? [],
      events: parsed.events ?? [],
      todos: parsed.todos ?? [],
      feedback: parsed.feedback ?? [],
    };
  } catch {
    return empty();
  }
}

export function writeGuest(store: GuestStore) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function guestOn() {
  return localStorage.getItem("fravia-guest") === "1";
}

export function setGuestOn(on: boolean) {
  if (on) localStorage.setItem("fravia-guest", "1");
  else localStorage.removeItem("fravia-guest");
}

export function clearGuest() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("fravia-guest");
}
