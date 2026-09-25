"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  GOOGLE_REDIRECT_URI,
  GOOGLE_SCOPE,
  createBody,
  googleConfigured,
  inWindow,
  isClock,
  isDate,
  movedSpan,
  toListedEvent,
  type GoogleItem,
  type ListedEvent,
} from "./googleTime";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const begin = action({
  args: {},
  handler: async (ctx): Promise<{ configured: false } | { configured: true; url: string }> => {
    if (!googleConfigured()) return { configured: false };
    const state = crypto.randomUUID();
    await ctx.runMutation(internal.google.rememberState, { state });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
    url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SCOPE);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "false");
    url.searchParams.set("state", state);
    return { configured: true, url: url.toString() };
  },
});

export const finish = action({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, args): Promise<{ ok: true } | { ok: false }> => {
    if (!googleConfigured()) return { ok: false };
    const link = await ctx.runQuery(internal.google.readMine, {});
    if (!link?.oauthState || link.oauthState !== args.state) return { ok: false };
    const refreshed = await exchange(args.code);
    if (!refreshed) return { ok: false };
    await ctx.runMutation(internal.google.saveRefresh, { refreshToken: refreshed });
    return { ok: true };
  },
});

export const disconnect = action({
  args: {},
  handler: async (ctx): Promise<{ ok: true }> => {
    const link = await ctx.runQuery(internal.google.readMine, {});
    if (link?.refreshToken) await revoke(link.refreshToken);
    await ctx.runMutation(internal.google.clearMine, {});
    return { ok: true };
  },
});

export const events = action({
  args: { today: v.string() },
  handler: async (ctx, args): Promise<{ connected: boolean; failed: boolean; events: ListedEvent[] }> => {
    if (!isDate(args.today)) return { connected: false, failed: false, events: [] };
    const link = await ctx.runQuery(internal.google.readMine, {});
    if (!link?.refreshToken) return { connected: false, failed: false, events: [] };
    const access = await accessToken(link.refreshToken);
    if (!access) return { connected: true, failed: true, events: [] };
    const listed = await listWindow(access, args.today);
    if (!listed) return { connected: true, failed: true, events: [] };
    return { connected: true, failed: false, events: listed };
  },
});

export const create = action({
  args: {
    title: v.string(),
    date: v.string(),
    time: v.optional(v.string()),
    end: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true } | { ok: false }> => {
    if (!args.title.trim() || !isDate(args.date) || !isClock(args.time) || !isClock(args.end)) return { ok: false };
    const link = await ctx.runQuery(internal.google.readMine, {});
    if (!link?.refreshToken) return { ok: false };
    const access = await accessToken(link.refreshToken);
    if (!access) return { ok: false };
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: jsonHeaders(access),
      body: JSON.stringify(createBody(args)),
    });
    return response.ok ? { ok: true } : { ok: false };
  },
});

export const move = action({
  args: { id: v.string(), date: v.string() },
  handler: async (ctx, args): Promise<{ ok: true } | { ok: false }> => {
    if (!isDate(args.date)) return { ok: false };
    const googleId = args.id.startsWith("gcal:") ? args.id.slice(5) : args.id;
    if (!googleId) return { ok: false };
    const link = await ctx.runQuery(internal.google.readMine, {});
    if (!link?.refreshToken) return { ok: false };
    const access = await accessToken(link.refreshToken);
    if (!access) return { ok: false };
    const current = await fetch(eventUrl(googleId), { headers: { Authorization: `Bearer ${access}` } });
    if (!current.ok) return { ok: false };
    const item = (await current.json()) as GoogleItem;
    if (!item.start) return { ok: false };
    const span = movedSpan(item.start, item.end, args.date);
    const response = await fetch(eventUrl(googleId), {
      method: "PATCH",
      headers: jsonHeaders(access),
      body: JSON.stringify(span),
    });
    return response.ok ? { ok: true } : { ok: false };
  },
});

async function exchange(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { refresh_token?: string };
  return json.refresh_token || null;
}

async function accessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { access_token?: string };
  return json.access_token || null;
}

async function revoke(refreshToken: string) {
  const body = new URLSearchParams({ token: refreshToken });
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).catch(() => undefined);
}

async function listWindow(access: string, today: string) {
  const events: ListedEvent[] = [];
  let page: string | null = null;
  const timeMin = new Date(`${today}T00:00:00Z`);
  timeMin.setUTCHours(timeMin.getUTCHours() - 14);
  const timeMax = new Date(`${today}T00:00:00Z`);
  timeMax.setUTCDate(timeMax.getUTCDate() + 15);
  for (let index = 0; index < 5; index += 1) {
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("timeMin", timeMin.toISOString());
    url.searchParams.set("timeMax", timeMax.toISOString());
    if (page) url.searchParams.set("pageToken", page);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
    if (!response.ok) return null;
    const json = (await response.json()) as { items?: GoogleItem[]; nextPageToken?: string };
    for (const item of json.items ?? []) {
      const listed = toListedEvent(item);
      if (listed && inWindow(listed.date, today)) events.push(listed);
    }
    page = json.nextPageToken ?? null;
    if (!page) break;
  }
  return events;
}

function eventUrl(id: string) {
  return `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(id)}`;
}

function jsonHeaders(access: string) {
  return {
    Authorization: `Bearer ${access}`,
    "Content-Type": "application/json",
  };
}
