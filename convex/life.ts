import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const kind = v.union(
  v.literal("termin"),
  v.literal("mahlzeit"),
  v.literal("sport"),
  v.literal("geburtstag"),
);

async function requireUser(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();
}

function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1 + months, d ?? 1));
  return date.toISOString().slice(0, 10);
}

function weekday(iso: string) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

function nextOpenDay(iso: string, saturday: boolean) {
  let cursor = addDays(iso, 1);
  for (let i = 0; i < 7; i += 1) {
    const day = weekday(cursor);
    if (day !== 0 && (saturday || day !== 6)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function seriesDates(start: string, freq: string, until?: string) {
  const dates = [start];
  if (!freq || freq === "none") return dates;
  let cursor = start;
  for (let i = 0; i < 23; i += 1) {
    if (freq === "daily") cursor = addDays(cursor, 1);
    else if (freq === "weekdays") cursor = nextOpenDay(cursor, false);
    else if (freq === "weekdays-sat") cursor = nextOpenDay(cursor, true);
    else if (freq === "weekly") cursor = addDays(cursor, 7);
    else if (freq === "monthly") cursor = addMonths(cursor, 1);
    else if (freq === "quarterly") cursor = addMonths(cursor, 3);
    else if (freq === "halfyearly") cursor = addMonths(cursor, 6);
    else if (freq === "yearly") cursor = addMonths(cursor, 12);
    else break;
    if (until && cursor > until) break;
    dates.push(cursor);
  }
  return dates;
}

export const span = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) return { events: [], todos: [], shared: [] };
    const events = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("date", args.start).lte("date", args.end),
      )
      .collect();
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("date", args.start).lte("date", args.end),
      )
      .collect();
    const accepted = await ctx.db
      .query("shares")
      .withIndex("by_accepted", (q) => q.eq("acceptedBy", user._id))
      .collect();
    const shared = [];
    for (const share of accepted) {
      if (share.status !== "accepted") continue;
      const rows = await ctx.db
        .query("events")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", share.ownerId).gte("date", args.start).lte("date", args.end),
        )
        .collect();
      for (const row of rows) {
        shared.push({
          _id: row._id,
          title: row.title,
          kind: row.kind,
          date: row.date,
          time: row.time,
          note: share.hidePhase ? undefined : row.note,
          freq: row.freq,
          seriesId: row.seriesId,
          shared: true,
        });
      }
    }
    return { events, todos, shared };
  },
});

export const addEvent = mutation({
  args: {
    title: v.string(),
    kind,
    date: v.string(),
    time: v.optional(v.string()),
    note: v.optional(v.string()),
    freq: v.string(),
    until: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const seriesId = crypto.randomUUID();
    const freq = args.kind === "geburtstag" && args.freq === "none" ? "yearly" : args.freq;
    for (const date of seriesDates(args.date, freq, args.until)) {
      await ctx.db.insert("events", {
        userId: user._id,
        title: args.title.slice(0, 140),
        kind: args.kind,
        date,
        freq,
        seriesId,
        ...(args.time ? { time: args.time } : {}),
        ...(args.note ? { note: args.note.slice(0, 280) } : {}),
      });
    }
    return seriesId;
  },
});

export const moveEvent = mutation({
  args: { id: v.id("events"), date: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return;
    await ctx.db.patch(args.id, { date: args.date });
  },
});

export const patchEvent = mutation({
  args: {
    id: v.id("events"),
    title: v.optional(v.string()),
    time: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return;
    await ctx.db.patch(args.id, {
      ...(args.title ? { title: args.title.slice(0, 140) } : {}),
      ...(args.time !== undefined ? { time: args.time } : {}),
      ...(args.note !== undefined ? { note: args.note.slice(0, 280) } : {}),
    });
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("events"), series: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return;
    if (!args.series) {
      await ctx.db.delete(args.id);
      return;
    }
    const all = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of all) {
      if (item.seriesId === row.seriesId) await ctx.db.delete(item._id);
    }
  },
});

export const addTodo = mutation({
  args: {
    title: v.string(),
    date: v.string(),
    freq: v.string(),
    until: v.optional(v.string()),
    energy: v.optional(v.number()),
    flexible: v.optional(v.boolean()),
    done: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const seriesId = crypto.randomUUID();
    for (const date of seriesDates(args.date, args.freq, args.until)) {
      await ctx.db.insert("todos", {
        userId: user._id,
        title: args.title.slice(0, 140),
        date,
        done: args.done ?? false,
        freq: args.freq,
        seriesId,
        ...(args.energy !== undefined ? { energy: args.energy } : {}),
        ...(args.flexible ? { flexible: true } : {}),
      });
    }
    return seriesId;
  },
});

export const toggleTodo = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return;
    await ctx.db.patch(args.id, { done: !row.done });
  },
});

export const patchTodo = mutation({
  args: {
    id: v.id("todos"),
    title: v.optional(v.string()),
    energy: v.optional(v.number()),
    flexible: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return;
    await ctx.db.patch(args.id, {
      ...(args.title ? { title: args.title.slice(0, 140) } : {}),
      ...(args.energy !== undefined ? { energy: args.energy } : {}),
      ...(args.flexible !== undefined ? { flexible: args.flexible } : {}),
    });
  },
});

export const deleteTodo = mutation({
  args: { id: v.id("todos"), series: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== user._id) return;
    if (!args.series) {
      await ctx.db.delete(args.id);
      return;
    }
    const all = await ctx.db
      .query("todos")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of all) {
      if (item.seriesId === row.seriesId) await ctx.db.delete(item._id);
    }
  },
});

export const createShare = mutation({
  args: { hidePhase: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const token = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("shares", {
      ownerId: user._id,
      token,
      status: "pending",
      ...(args.hidePhase ? { hidePhase: true } : {}),
    });
    return token;
  },
});

export const acceptShare = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const share = await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!share || share.ownerId === user._id) return false;
    await ctx.db.patch(share._id, { status: "accepted", acceptedBy: user._id });
    return true;
  },
});

export const shareState = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("shares")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!share) return { state: "missing" as const };
    return { state: share.status };
  },
});

export const myShares = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("shares")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
    return rows.map((row) => ({
      token: row.token,
      status: row.status,
      hidePhase: row.hidePhase ?? false,
    }));
  },
});

export const saveFeedback = mutation({
  args: { message: v.string(), category: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.insert("feedback", {
      ...(user ? { userId: user._id } : {}),
      message: args.message.slice(0, 2000),
      category: args.category.slice(0, 40),
    });
  },
});

export const savePush = mutation({
  args: { endpoint: v.string(), keys: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of existing) {
      if (row.endpoint === args.endpoint) return row._id;
    }
    return await ctx.db.insert("pushSubscriptions", {
      userId: user._id,
      endpoint: args.endpoint,
      ...(args.keys ? { keys: args.keys } : {}),
    });
  },
});

export const clearPush = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return;
    const rows = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  },
});

export const ensureFeed = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profil fehlt");
    if (profile.feedToken) return profile.feedToken;
    const feedToken = crypto.randomUUID().replace(/-/g, "");
    await ctx.db.patch(profile._id, { feedToken });
    return feedToken;
  },
});

export const patchDetails = mutation({
  args: {
    diet: v.optional(v.string()),
    movement: v.optional(v.string()),
    referral: v.optional(v.string()),
    displayName: v.optional(v.string()),
    irregular: v.optional(v.boolean()),
    endo: v.optional(
      v.union(v.literal("none"), v.literal("suspected"), v.literal("diagnosed")),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return;
    await ctx.db.patch(profile._id, {
      ...(args.diet !== undefined ? { diet: args.diet.slice(0, 280) } : {}),
      ...(args.movement !== undefined ? { movement: args.movement.slice(0, 280) } : {}),
      ...(args.referral !== undefined ? { referral: args.referral.slice(0, 80) } : {}),
      ...(args.displayName !== undefined
        ? { displayName: args.displayName.slice(0, 80) }
        : {}),
      ...(args.irregular !== undefined ? { irregular: args.irregular } : {}),
      ...(args.endo !== undefined ? { endo: args.endo } : {}),
    });
  },
});

export const feed = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_feed", (q) => q.eq("feedToken", args.token))
      .first();
    if (!profile || !args.token) return [];
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 30);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + 180);
    const rows = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) =>
        q
          .eq("userId", profile.userId)
          .gte("date", start.toISOString().slice(0, 10))
          .lte("date", end.toISOString().slice(0, 10)),
      )
      .collect();
    return rows.map((row) => ({
      id: row._id,
      title: row.title,
      date: row.date,
      time: row.time ?? "",
      kind: row.kind,
    }));
  },
});

export const adjustments = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("adjustments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return rows
      .sort((a, b) => b.at - a.at)
      .slice(0, 6)
      .map((row) => ({ at: row.at, note: row.note }));
  },
});

export const deleteMine = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return;
    const id = user._id;
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", id))
      .collect();
    for (const row of profiles) await ctx.db.delete(row._id);
    const logs = await ctx.db
      .query("dayLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", id))
      .collect();
    for (const row of logs) await ctx.db.delete(row._id);
    const events = await ctx.db
      .query("events")
      .withIndex("by_user_date", (q) => q.eq("userId", id))
      .collect();
    for (const row of events) await ctx.db.delete(row._id);
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_date", (q) => q.eq("userId", id))
      .collect();
    for (const row of todos) await ctx.db.delete(row._id);
    const pushes = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", id))
      .collect();
    for (const row of pushes) await ctx.db.delete(row._id);
    const owned = await ctx.db
      .query("shares")
      .withIndex("by_owner", (q) => q.eq("ownerId", id))
      .collect();
    for (const row of owned) await ctx.db.delete(row._id);
    const accepted = await ctx.db
      .query("shares")
      .withIndex("by_accepted", (q) => q.eq("acceptedBy", id))
      .collect();
    for (const row of accepted) await ctx.db.delete(row._id);
    const notes = await ctx.db
      .query("adjustments")
      .withIndex("by_user", (q) => q.eq("userId", id))
      .collect();
    for (const row of notes) await ctx.db.delete(row._id);
    await ctx.db.delete(id);
  },
});

export const interpret = action({
  args: { transcript: v.string() },
  handler: async (_ctx, args) => {
    const paidKey = process.env.OPENAI_API_KEY || process.env.VOICE_API_KEY;
    return {
      mode: paidKey ? ("keyed" as const) : ("local" as const),
      transcript: args.transcript.slice(0, 500),
    };
  },
});
