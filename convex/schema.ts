import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const persona = v.union(
  v.literal("rhythm"),
  v.literal("pill"),
  v.literal("pain"),
  v.literal("menopause"),
);

export const bleeding = v.union(
  v.literal("none"),
  v.literal("light"),
  v.literal("medium"),
  v.literal("heavy"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  googleLinks: defineTable({
    userId: v.id("users"),
    refreshToken: v.optional(v.string()),
    oauthState: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  dayLogs: defineTable({
    userId: v.id("users"),
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
  }).index("by_user_date", ["userId", "date"]),

  events: defineTable({
    userId: v.id("users"),
    title: v.string(),
    kind: v.union(
      v.literal("termin"),
      v.literal("mahlzeit"),
      v.literal("sport"),
      v.literal("geburtstag"),
    ),
    date: v.string(),
    time: v.optional(v.string()),
    end: v.optional(v.string()),
    location: v.optional(v.string()),
    remind: v.optional(v.number()),
    note: v.optional(v.string()),
    freq: v.string(),
    seriesId: v.string(),
  }).index("by_user_date", ["userId", "date"]),

  todos: defineTable({
    userId: v.id("users"),
    title: v.string(),
    date: v.string(),
    done: v.boolean(),
    freq: v.string(),
    seriesId: v.string(),
    energy: v.optional(v.number()),
    flexible: v.optional(v.boolean()),
  }).index("by_user_date", ["userId", "date"]),

  shares: defineTable({
    ownerId: v.id("users"),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    acceptedBy: v.optional(v.id("users")),
    hidePhase: v.optional(v.boolean()),
  })
    .index("by_token", ["token"])
    .index("by_owner", ["ownerId"])
    .index("by_accepted", ["acceptedBy"]),

  feedback: defineTable({
    userId: v.optional(v.id("users")),
    message: v.string(),
    category: v.string(),
  }),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    keys: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  adjustments: defineTable({
    userId: v.id("users"),
    at: v.number(),
    note: v.string(),
  }).index("by_user", ["userId"]),

  profiles: defineTable({
    userId: v.id("users"),
    persona,
    lastPeriodStart: v.optional(v.string()),
    cycleLength: v.optional(v.number()),
    periodLength: v.optional(v.number()),
    lutealLength: v.optional(v.number()),
    packLength: v.optional(v.number()),
    feedToken: v.optional(v.string()),
    diet: v.optional(v.string()),
    movement: v.optional(v.string()),
    referral: v.optional(v.string()),
    displayName: v.optional(v.string()),
    irregular: v.optional(v.boolean()),
    endo: v.optional(
      v.union(v.literal("none"), v.literal("suspected"), v.literal("diagnosed")),
    ),
  }).index("by_user", ["userId"]).index("by_feed", ["feedToken"]),
});
