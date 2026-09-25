import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { googleConfigured } from "./googleTime";

async function requireUser(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
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

async function linkFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("googleLinks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    const configured = googleConfigured();
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { configured, connected: false };
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    if (!user) return { configured, connected: false };
    const link = await linkFor(ctx, user._id);
    return { configured, connected: Boolean(link?.refreshToken) };
  },
});

export const rememberState = internalMutation({
  args: { state: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const existing = await linkFor(ctx, user._id);
    if (existing) {
      await ctx.db.patch(existing._id, { oauthState: args.state });
      return;
    }
    await ctx.db.insert("googleLinks", { userId: user._id, oauthState: args.state });
  },
});

export const readMine = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return null;
    const link = await linkFor(ctx, user._id);
    if (!link) return null;
    return {
      refreshToken: link.refreshToken ?? null,
      oauthState: link.oauthState ?? null,
    };
  },
});

export const saveRefresh = internalMutation({
  args: { refreshToken: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user) throw new Error("Nicht angemeldet");
    const existing = await linkFor(ctx, user._id);
    if (existing) {
      await ctx.db.replace(existing._id, { userId: existing.userId, refreshToken: args.refreshToken });
      return;
    }
    await ctx.db.insert("googleLinks", { userId: user._id, refreshToken: args.refreshToken });
  },
});

export const clearMine = internalMutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user) return;
    const existing = await linkFor(ctx, user._id);
    if (existing) await ctx.db.delete(existing._id);
  },
});
