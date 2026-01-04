import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    steamId: v.string(),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    elo_1v1: v.float64(),
    elo_5v5: v.float64(),
    isBanned: v.boolean(),
    isPremium: v.optional(v.boolean()),
    hasAbandoned: v.optional(v.boolean()),
  }).index("by_clerkId", ["clerkId"]),

  queue_entries: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    joinedAt: v.int64(),
  }).index("by_mode", ["mode"]),

  matches: defineTable({
    state: v.union(
      v.literal("VETO"),
      v.literal("CONFIGURING"),
      v.literal("WARMUP"),
      v.literal("LIVE"),
      v.literal("FINISHED"),
      v.literal("CANCELLED")
    ),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    teamA: v.array(v.id("users")),
    teamB: v.array(v.id("users")),
    mapPool: v.array(v.string()),
    bannedMaps: v.array(v.string()),
    selectedMap: v.optional(v.string()),
    locationPool: v.optional(v.array(v.string())),
    bannedLocations: v.optional(v.array(v.string())),
    selectedLocation: v.optional(v.string()),
    serverIp: v.optional(v.string()),
    dathostMatchId: v.optional(v.string()),
    dathostServerId: v.optional(v.string()),
    winnerId: v.optional(v.id("users")),
    mvpId: v.optional(v.id("users")),
    scoreTeamA: v.optional(v.float64()),
    scoreTeamB: v.optional(v.float64()),
    currentRound: v.optional(v.float64()),
    warmupEndsAt: v.optional(v.int64()),
    finishedAt: v.optional(v.int64()),
    duration: v.optional(v.float64()),
  }).index("by_state", ["state"]),

  player_stats: defineTable({
    matchId: v.id("matches"),
    userId: v.id("users"),
    kills: v.float64(),
    deaths: v.float64(),
    assists: v.float64(),
    mvps: v.float64(),
    connected: v.boolean(),
    eloChange: v.optional(v.float64()),
    oldElo: v.optional(v.float64()),
    newElo: v.optional(v.float64()),
  }).index("by_match", ["matchId"]).index("by_user_match", ["userId", "matchId"]),

  match_history: defineTable({
    matchId: v.id("matches"),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    map: v.string(),
    teamA: v.array(v.id("users")),
    teamB: v.array(v.id("users")),
    winnerId: v.id("users"),
    scoreTeamA: v.float64(),
    scoreTeamB: v.float64(),
    finishedAt: v.int64(),
    demoUrl: v.optional(v.string()),
  }).index("by_user", ["teamA"]).index("by_finished", ["finishedAt"]),

  reports: defineTable({
    reporterId: v.id("users"),
    reportedId: v.id("users"),
    matchId: v.id("matches"),
    reason: v.string(),
    createdAt: v.int64(),
  }).index("by_reported", ["reportedId"]),

  friendships: defineTable({
    user1: v.id("users"),
    user2: v.id("users"),
    status: v.union(v.literal("PENDING"), v.literal("ACCEPTED")),
    createdAt: v.int64(),
  }).index("by_user1", ["user1"]).index("by_user2", ["user2"]).index("by_users", ["user1", "user2"]),

  messages: defineTable({
    channelId: v.string(),
    authorId: v.id("users"),
    content: v.string(),
    createdAt: v.int64(),
  }).index("by_channel", ["channelId", "createdAt"]),

  parties: defineTable({
    leaderId: v.id("users"),
    members: v.array(v.id("users")),
    createdAt: v.int64(),
  }).index("by_leader", ["leaderId"]),
});
