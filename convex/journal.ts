import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { bleeding, persona } from "./schema";

async function requireUser(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .first();
  if (existing) return existing;
  if (!("insert" in ctx.db)) return null;
  const id = await (ctx as MutationCtx).db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name || undefined,
    email: identity.email || undefined,
  });
  return await ctx.db.get(id);
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { state: "signed-out" as const };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .first();
    if (!user) return { state: "pending" as const };
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return { state: "onboarding" as const };
    return { state: "ready" as const, profile };
  },
});

export const saveProfile = mutation({
  args: {
    persona,
    lastPeriodStart: v.optional(v.string()),
    cycleLength: v.optional(v.number()),
    periodLength: v.optional(v.number()),
    lutealLength: v.optional(v.number()),
    packLength: v.optional(v.number()),
    irregular: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    const doc: {
      userId: Id<"users">;
      persona: typeof args.persona;
      lastPeriodStart?: string;
      cycleLength?: number;
      periodLength?: number;
      lutealLength?: number;
      packLength?: number;
    } = {
      userId: user._id,
      persona: args.persona,
    };
    if (args.lastPeriodStart) doc.lastPeriodStart = args.lastPeriodStart;
    if (args.cycleLength) doc.cycleLength = args.cycleLength;
    if (args.periodLength) doc.periodLength = args.periodLength;
    if (args.lutealLength) doc.lutealLength = args.lutealLength;
    if (args.packLength) doc.packLength = args.packLength;
    const changed =
      existing &&
      (existing.cycleLength !== doc.cycleLength ||
        existing.periodLength !== doc.periodLength ||
        existing.lutealLength !== doc.lutealLength ||
        existing.packLength !== doc.packLength ||
        existing.persona !== doc.persona);
    if (changed) {
      const bits = [
        doc.cycleLength ? `Zyklus ${doc.cycleLength}` : "",
        doc.periodLength ? `Periode ${doc.periodLength}` : "",
        doc.lutealLength ? `Luteal ${doc.lutealLength}` : "",
        doc.packLength ? `Pack ${doc.packLength}` : "",
      ].filter(Boolean);
      await ctx.db.insert("adjustments", {
        userId: user._id,
        at: Date.now(),
        note: bits.length
          ? `Ich rechne jetzt mit ${bits.join(", ")}.`
          : "Ich habe die Ausrichtung angepasst.",
      });
    }
    const id = await ctx.db.insert("profiles", {
      ...doc,
      ...(args.irregular !== undefined
        ? { irregular: args.irregular }
        : existing?.irregular
          ? { irregular: existing.irregular }
          : {}),
      ...(existing?.feedToken ? { feedToken: existing.feedToken } : {}),
      ...(existing?.diet ? { diet: existing.diet } : {}),
      ...(existing?.movement ? { movement: existing.movement } : {}),
      ...(existing?.referral ? { referral: existing.referral } : {}),
      ...(existing?.displayName ? { displayName: existing.displayName } : {}),
      ...(existing?.endo ? { endo: existing.endo } : {}),
    });
    return await ctx.db.get(id);
  },
});

export const daysInRange = query({
  args: { start: v.string(), end: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .first();
    if (!user) return [];
    return await ctx.db
      .query("dayLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).gte("date", args.start).lte("date", args.end),
      )
      .collect();
  },
});

export const saveDay = mutation({
  args: {
    date: v.string(),
    bleeding,
    energy: v.optional(v.number()),
    note: v.string(),
    pain: v.optional(
      v.union(
        v.literal("none"),
        v.literal("light"),
        v.literal("strong"),
        v.literal("out"),
      ),
    ),
    mood: v.optional(
      v.union(v.literal("even"), v.literal("thin"), v.literal("raw")),
    ),
    heat: v.optional(
      v.union(v.literal("none"), v.literal("warm"), v.literal("hot")),
    ),
    sleep: v.optional(
      v.union(v.literal("steady"), v.literal("broken"), v.literal("short")),
    ),
    symptoms: v.optional(v.array(v.string())),
    ovulation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    if (args.note.length > 280) throw new Error("Der Satz ist zu lang.");
    if (args.energy !== undefined && (args.energy < 1 || args.energy > 5)) {
      throw new Error("Energie liegt zwischen 1 und 5.");
    }
    const existing = await ctx.db
      .query("dayLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date),
      )
      .first();
    if (existing) await ctx.db.delete(existing._id);
    return await ctx.db.insert("dayLogs", {
      userId: user._id,
      date: args.date,
      bleeding: args.bleeding,
      note: args.note.trim(),
      ...(args.energy !== undefined ? { energy: args.energy } : {}),
      ...(args.pain ? { pain: args.pain } : {}),
      ...(args.mood ? { mood: args.mood } : {}),
      ...(args.heat ? { heat: args.heat } : {}),
      ...(args.sleep ? { sleep: args.sleep } : {}),
      ...(args.symptoms ? { symptoms: args.symptoms.slice(0, 8) } : {}),
      ...(args.ovulation !== undefined ? { ovulation: args.ovulation } : {}),
    });
  },
});
