import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // FASE 35: Staff Members (RBAC)
  staff_members: defineTable({
    email: v.string(),
    role: v.union(v.literal("ADMIN"), v.literal("SUPPORT")),
    addedBy: v.id("users"),
    addedAt: v.int64(),
  })
    .index("by_email", ["email"]),

  // FASE 37: Audit Logs (Deep Logging)
  audit_logs: defineTable({
    timestamp: v.int64(),
    actorId: v.optional(v.id("users")),
    actorEmail: v.string(),
    action: v.string(),
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    metadata: v.optional(v.string()),
  }),

  users: defineTable({
    clerkId: v.string(),
    steamId: v.string(),
    steamName: v.optional(v.string()),
    steamAvatar: v.optional(v.string()),
    steamProfileUrl: v.optional(v.string()),
    nickname: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    elo_1v1: v.float64(),
    elo_5v5: v.float64(),
    isBanned: v.boolean(),
    isPremium: v.optional(v.boolean()),
    hasAbandoned: v.optional(v.boolean()),
    balance: v.optional(v.float64()),
    reputation: v.optional(v.float64()),
    referredBy: v.optional(v.id("users")),
    referralCode: v.optional(v.string()),
    matchesPlayed: v.optional(v.float64()),
    // FASE 30: Trust Factor & Anti-Smurf
    trustScore: v.optional(v.float64()),
    steamHours: v.optional(v.float64()),
    steamAccountAge: v.optional(v.float64()),
    vacBans: v.optional(v.float64()),
    gameBans: v.optional(v.float64()),
    isVerified: v.optional(v.boolean()),
    lastTrustUpdate: v.optional(v.int64()),
  }).index("by_clerkId", ["clerkId"]).index("by_referralCode", ["referralCode"]).index("by_nickname", ["nickname"]),

  queue_entries: defineTable({
    userId: v.id("users"),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    joinedAt: v.int64(),
    cooldownUntil: v.optional(v.int64()),
  }).index("by_mode", ["mode"]).index("by_user", ["userId"]),

  matches: defineTable({
    state: v.union(
      v.literal("CONFIRMING"),
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
    acceptedPlayers: v.optional(v.array(v.id("users"))),
    confirmationDeadline: v.optional(v.int64()),
    mapPool: v.array(v.string()),
    bannedMaps: v.array(v.string()),
    selectedMap: v.optional(v.string()),
    locationPool: v.optional(v.array(v.string())),
    bannedLocations: v.optional(v.array(v.string())),
    selectedLocation: v.optional(v.string()),
    serverIp: v.optional(v.string()),
    dathostMatchId: v.optional(v.string()),
    dathostServerId: v.optional(v.string()),
    rconPassword: v.optional(v.string()), // FASE 60: RCON password for server control
    whitelistedPlayers: v.optional(v.array(v.string())), // FASE 60: SteamIDs allowed to connect
    connectedSteamIds: v.optional(v.array(v.string())),
    provisioningStarted: v.optional(v.boolean()),
    countdownStarted: v.optional(v.boolean()),
    startSequenceTriggered: v.optional(v.boolean()),
    startingSideCt: v.optional(v.id("users")),
    startingSideT: v.optional(v.id("users")),
    teamCtId: v.optional(v.id("users")),
    teamTId: v.optional(v.id("users")),
    winnerId: v.optional(v.id("users")),
    mvpId: v.optional(v.id("users")),
    scoreTeamA: v.optional(v.float64()),
    scoreTeamB: v.optional(v.float64()),
    currentRound: v.optional(v.float64()),
    warmupEndsAt: v.optional(v.int64()),
    startTime: v.optional(v.int64()),
    finishedAt: v.optional(v.int64()),
    duration: v.optional(v.float64()),
    demoUrl: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    serverCost: v.optional(v.float64()),
  }).index("by_state", ["state"]),

  player_stats: defineTable({
    matchId: v.id("matches"),
    userId: v.id("users"),
    kills: v.float64(),
    deaths: v.float64(),
    assists: v.float64(),
    mvps: v.float64(),
    connected: v.optional(v.boolean()),
    isReady: v.optional(v.boolean()), // FASE 45: .ready system
    eloChange: v.optional(v.float64()),
    oldElo: v.optional(v.float64()),
    newElo: v.optional(v.float64()),
    headshots: v.optional(v.float64()),
    headshotPercentage: v.optional(v.float64()),
    tripleKills: v.optional(v.float64()),
    quadraKills: v.optional(v.float64()),
    aces: v.optional(v.float64()),
    clutches: v.optional(v.float64()),
    firstKills: v.optional(v.float64()),
    damage: v.optional(v.float64()),
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
    reason: v.union(
      v.literal("TOXIC"),
      v.literal("CHEATING"),
      v.literal("AFK"),
      v.literal("GRIEFING"),
      v.literal("SMURFING")
    ),
    comment: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("REVIEWED"),
      v.literal("VALIDATED"),
      v.literal("DISMISSED")
    ),
    createdAt: v.int64(),
    reviewedAt: v.optional(v.int64()),
    reviewedBy: v.optional(v.id("users")),
  }).index("by_reported", ["reportedId"]).index("by_status", ["status"]).index("by_match", ["matchId"]),

  transactions: defineTable({
    userId: v.id("users"),
    amount: v.float64(),
    type: v.union(
      v.literal("ADMIN"),
      v.literal("MATCH_WIN"),
      v.literal("MATCH_LOSS"),
      v.literal("REFERRAL"),
      v.literal("REFUND"),
      v.literal("STORE"),
      v.literal("SYSTEM")
    ),
    description: v.string(),
    timestamp: v.int64(),
    relatedMatchId: v.optional(v.id("matches")),
  }).index("by_user", ["userId"]).index("by_timestamp", ["timestamp"]),

  referrals: defineTable({
    referrerId: v.id("users"),
    referredId: v.id("users"),
    status: v.union(v.literal("PENDING"), v.literal("COMPLETED")),
    rewardClaimed: v.boolean(),
    createdAt: v.int64(),
  }).index("by_referrer", ["referrerId"]).index("by_referred", ["referredId"]),

  /**
   * FASE 32: SUPPORT SYSTEM - Tickets
   */
  tickets: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("BILLING"),
      v.literal("BUG"),
      v.literal("REPORT"),
      v.literal("OTHER")
    ),
    subject: v.string(),
    status: v.union(
      v.literal("OPEN"),
      v.literal("IN_PROGRESS"),
      v.literal("CLOSED")
    ),
    priority: v.union(
      v.literal("LOW"),
      v.literal("HIGH"),
      v.literal("URGENT")
    ),
    createdAt: v.int64(),
    updatedAt: v.int64(),
    closedAt: v.optional(v.int64()),
    closedBy: v.optional(v.id("users")),
  }).index("by_user", ["userId"]).index("by_status", ["status"]).index("by_priority", ["priority"]),

  ticket_messages: defineTable({
    ticketId: v.id("tickets"),
    senderId: v.id("users"),
    content: v.string(),
    isAdminReply: v.boolean(),
    createdAt: v.int64(),
  }).index("by_ticket", ["ticketId"]),

  /**
   * FASE 32: SUPPORT SYSTEM - Lobby SOS Alerts
   */
  lobby_alerts: defineTable({
    matchId: v.id("matches"),
    userId: v.id("users"),
    reason: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("RESOLVED")
    ),
    adminId: v.optional(v.id("users")),
    createdAt: v.int64(),
    resolvedAt: v.optional(v.int64()),
  }).index("by_match", ["matchId"]).index("by_status", ["status"]),

  // FASE 38: Friends & Direct Messages
  friends: defineTable({
    user1Id: v.id("users"),
    user2Id: v.id("users"),
    status: v.union(v.literal("PENDING"), v.literal("ACCEPTED")),
    actionUserId: v.id("users"), // Who sent the request
    createdAt: v.int64(),
  })
    .index("by_user1", ["user1Id"])
    .index("by_user2", ["user2Id"])
    .index("by_users", ["user1Id", "user2Id"])
    .index("by_status", ["status"]),

  direct_messages: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    content: v.string(),
    read: v.boolean(),
    timestamp: v.int64(),
  })
    .index("by_sender", ["senderId"])
    .index("by_receiver", ["receiverId"])
    .index("by_conversation", ["senderId", "receiverId", "timestamp"]),

  // Legacy tables (keep for backwards compatibility)
  friendships: defineTable({
    user1: v.id("users"),
    user2: v.id("users"),
    status: v.union(v.literal("PENDING"), v.literal("ACCEPTED")),
    createdAt: v.int64(),
  }).index("by_user1", ["user1"]).index("by_user2", ["user2"]).index("by_users", ["user1", "user2"]),

  chats: defineTable({
    participants: v.array(v.id("users")),
    lastMessageAt: v.optional(v.int64()),
    createdAt: v.int64(),
  }).index("by_participants", ["participants"]),

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

  /**
   * FASE 26-29: SCHEMA EXPANSION
   * Added tournaments, notifications, referral system, nickname routing
   * Updated: Force regeneration for SYSTEM and REFERRAL transaction types
   */
  tournaments: defineTable({
    name: v.string(),
    startDate: v.int64(),
    maxPlayers: v.float64(), // 8, 16, 32
    prizePool: v.float64(),
    status: v.union(
      v.literal("REGISTRATION"),
      v.literal("ONGOING"),
      v.literal("FINISHED")
    ),
    createdAt: v.int64(),
    winnerId: v.optional(v.id("users")),
  }).index("by_status", ["status"]),

  tournament_entries: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    seed: v.optional(v.float64()), // Position after shuffle
    createdAt: v.int64(),
  }).index("by_tournament", ["tournamentId"]).index("by_user", ["userId"]),

  tournament_matches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.float64(), // 1 = Quarter-finals, 2 = Semi-finals, 3 = Finals
    matchNumber: v.float64(), // Position in round (1, 2, 3, 4...)
    matchId: v.optional(v.id("matches")), // Link to actual match
    player1Id: v.optional(v.id("users")),
    player2Id: v.optional(v.id("users")),
    winnerId: v.optional(v.id("users")),
    nextMatchId: v.optional(v.id("tournament_matches")), // Where winner advances
    status: v.union(
      v.literal("PENDING"), // Waiting for players
      v.literal("READY"), // Both players assigned
      v.literal("LIVE"), // Match in progress
      v.literal("FINISHED") // Match completed
    ),
  }).index("by_tournament", ["tournamentId"]).index("by_match", ["matchId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    type: v.union(
      v.literal("TOURNAMENT"),
      v.literal("MATCH_READY"),
      v.literal("SYSTEM"),
      v.literal("FRIEND_REQUEST")
    ),
    createdAt: v.int64(),
  }).index("by_user", ["userId"]).index("by_user_read", ["userId", "read"]),

  user_badges: defineTable({
    userId: v.id("users"),
    badgeId: v.string(), // "sniper_elite", "winstreak_5", "early_adopter"
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    earnedAt: v.int64(),
  }).index("by_user", ["userId"]),
});
