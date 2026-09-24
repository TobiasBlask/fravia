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

  profiles: defineTable({
    userId: v.id("users"),
    persona,
    lastPeriodStart: v.optional(v.string()),
    cycleLength: v.optional(v.number()),
    periodLength: v.optional(v.number()),
    lutealLength: v.optional(v.number()),
    packLength: v.optional(v.number()),
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
  }).index("by_user_date", ["userId", "date"]),
});
