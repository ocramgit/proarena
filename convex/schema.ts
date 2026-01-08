import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // FASE 35: Staff Members (RBAC) - Updated FASE 55 with REDATOR
  staff_members: defineTable({
    email: v.string(),
    role: v.union(
      v.literal("ADMIN"),
      v.literal("SUPPORT"),
      v.literal("ORGANIZER"),
      v.literal("REDATOR") // FASE 55: News writer role
    ),
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
    // FASE 54: Profile 3.0 - Customization
    profileBannerUrl: v.optional(v.string()),
    themeColor: v.optional(v.string()), // "amber", "purple", "cyan", "red", "green"
    country: v.optional(v.string()), // ISO country code "PT", "BR", "US"
    bio: v.optional(v.string()),
    // FASE 54: Setup & Peripherals (HLTV Style)
    crosshairCode: v.optional(v.string()),
    resolution: v.optional(v.string()), // "1920x1080", "1280x960"
    aspectRatio: v.optional(v.string()), // "16:9", "4:3"
    mouseDpi: v.optional(v.float64()),
    sensitivity: v.optional(v.float64()),
    mouseModel: v.optional(v.string()),
    keyboardModel: v.optional(v.string()),
    monitorModel: v.optional(v.string()),
    headsetModel: v.optional(v.string()),
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
   * FASE 51: TOURNAMENT SYSTEM (EXPANDED)
   * Full tournament management with brackets, prizes, and live updates
   */
  tournaments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    startDate: v.int64(),
    checkInDate: v.optional(v.int64()), // When check-in opens (e.g. 30min before)
    mode: v.union(v.literal("1v1"), v.literal("2v2"), v.literal("5v5")),
    maxTeams: v.float64(), // 4, 8, 16, 32, 64
    currentTeams: v.optional(v.float64()),
    // Seeding
    seedType: v.union(v.literal("RANDOM"), v.literal("MANUAL"), v.literal("ELO")),
    // Prize Mode
    prizeMode: v.union(v.literal("CUSTOM"), v.literal("SOBERANAS")),
    // Custom prizes (text)
    prize1st: v.optional(v.string()),
    prize2nd: v.optional(v.string()),
    prize3rd: v.optional(v.string()),
    // Soberanas prize pool
    prizePool: v.optional(v.float64()), // Total Soberanas
    buyIn: v.optional(v.float64()), // Entry fee per team
    distribution: v.optional(v.array(v.float64())), // [50, 30, 20] percentages
    // Status
    status: v.union(
      v.literal("DRAFT"),
      v.literal("REGISTRATION"),
      v.literal("CHECKIN"),
      v.literal("ONGOING"),
      v.literal("FINISHED"),
      v.literal("CANCELLED")
    ),
    // Metadata
    createdBy: v.id("users"),
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
    winnerId: v.optional(v.id("users")),
    secondPlaceId: v.optional(v.id("users")),
    thirdPlaceId: v.optional(v.id("users")),
  }).index("by_status", ["status"]).index("by_startDate", ["startDate"]),

  tournament_teams: defineTable({
    tournamentId: v.id("tournaments"),
    name: v.string(),
    captainId: v.id("users"),
    members: v.array(v.id("users")), // All team members including captain
    seed: v.optional(v.float64()), // Position after seeding
    checkedIn: v.optional(v.boolean()),
    eliminated: v.optional(v.boolean()),
    placement: v.optional(v.float64()), // Final placement (1st, 2nd, etc)
    createdAt: v.int64(),
  }).index("by_tournament", ["tournamentId"]).index("by_captain", ["captainId"]),

  tournament_matches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.float64(), // 1 = Round 1, 2 = Round 2, etc. (Finals = highest)
    matchNumber: v.float64(), // Position in round (1, 2, 3, 4...)
    bracketPosition: v.optional(v.string()), // "upper", "lower", "grand" for double elim
    team1Id: v.optional(v.id("tournament_teams")),
    team2Id: v.optional(v.id("tournament_teams")),
    winnerId: v.optional(v.id("tournament_teams")),
    loserId: v.optional(v.id("tournament_teams")),
    score1: v.optional(v.float64()),
    score2: v.optional(v.float64()),
    matchId: v.optional(v.id("matches")), // Link to actual game match
    nextMatchId: v.optional(v.id("tournament_matches")), // Winner advances here
    scheduledTime: v.optional(v.int64()),
    startedAt: v.optional(v.int64()),
    finishedAt: v.optional(v.int64()),
    status: v.union(
      v.literal("TBD"), // Waiting for teams
      v.literal("SCHEDULED"), // Teams assigned, waiting to start
      v.literal("LIVE"), // Match in progress
      v.literal("FINISHED") // Match completed
    ),
  }).index("by_tournament", ["tournamentId"]).index("by_round", ["tournamentId", "round"]).index("by_match", ["matchId"]),

  // Legacy tournament_entries - keep for backwards compatibility
  tournament_entries: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    seed: v.optional(v.float64()),
    createdAt: v.int64(),
  }).index("by_tournament", ["tournamentId"]).index("by_user", ["userId"]),

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

  /**
   * FASE 54: ORGANIZATIONS (ORG HUB)
   * Full organization/team management system
   */
  organizations: defineTable({
    name: v.string(),
    tag: v.string(), // Short tag like "NAVI", "G2"
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    // Social links
    twitterUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    discordUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    // Ownership
    ownerId: v.id("users"),
    managersIds: v.optional(v.array(v.id("users"))),
    // Verification
    isVerified: v.optional(v.boolean()),
    verifiedAt: v.optional(v.int64()),
    // Stats cache
    totalWins: v.optional(v.float64()),
    totalLosses: v.optional(v.float64()),
    rankingPoints: v.optional(v.float64()),
    currentRank: v.optional(v.float64()),
    previousRank: v.optional(v.float64()),
    // Metadata
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_tag", ["tag"])
    .index("by_rank", ["currentRank"])
    .index("by_points", ["rankingPoints"]),

  /**
   * FASE 54: ORGANIZATION MEMBERS (ROSTER)
   */
  org_members: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("OWNER"),      // 👑 Full access + Financial + Delete Org
      v.literal("MANAGER"),    // 🛠️ Roster, Praccs, Accept invites (no financial)
      v.literal("COACH"),      // 🎓 Stratbook, Spectator, Tactics
      v.literal("CAPTAIN"),    // 🔫 Map Vetos, team lead in-game
      v.literal("PLAYER"),     // 👤 Base member, plays matches
      v.literal("ANALYST"),    // 📊 Stats access, demo review
      v.literal("BENCH"),      // 🪑 Inactive player
      v.literal("STAND_IN")    // ⏳ Temporary access, NO stratbook
    ),
    gameRole: v.optional(v.string()), // "IGL", "Entry", "AWPer", "Support", "Lurker"
    jerseyNumber: v.optional(v.float64()),
    joinedAt: v.int64(),
    leftAt: v.optional(v.int64()),
    expiresAt: v.optional(v.int64()), // For STAND_IN temporary access
    isActive: v.boolean(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_active", ["orgId", "isActive"]),

  /**
   * FASE 54: ORGANIZATION SPONSORS
   */
  org_sponsors: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    tier: v.union(v.literal("MAIN"), v.literal("PARTNER"), v.literal("SUPPORTER")),
    displayOrder: v.float64(),
    createdAt: v.int64(),
  }).index("by_org", ["orgId"]),

  /**
   * FASE 54: ORGANIZATION MATCH HISTORY
   */
  org_matches: defineTable({
    orgId: v.id("organizations"),
    opponentOrgId: v.optional(v.id("organizations")),
    opponentName: v.string(), // In case opponent not on platform
    tournamentId: v.optional(v.id("tournaments")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    matchId: v.optional(v.id("matches")),
    map: v.string(),
    scoreUs: v.float64(),
    scoreThem: v.float64(),
    isWin: v.boolean(),
    playedAt: v.int64(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_date", ["orgId", "playedAt"]),

  /**
   * FASE 54: ORGANIZATION INVITES/APPLICATIONS
   */
  org_invites: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    type: v.union(v.literal("INVITE"), v.literal("APPLICATION")),
    role: v.union(v.literal("PLAYER"), v.literal("COACH"), v.literal("ANALYST")),
    message: v.optional(v.string()),
    status: v.union(v.literal("PENDING"), v.literal("ACCEPTED"), v.literal("REJECTED")),
    createdAt: v.int64(),
    respondedAt: v.optional(v.int64()),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  /**
   * FASE 54: ARTICLES (NEWSROOM CMS)
   */
  articles: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    content: v.string(), // Markdown or HTML
    coverImageUrl: v.optional(v.string()),
    // Article type
    type: v.union(
      v.literal("EDITORIAL"), // Staff articles
      v.literal("ANNOUNCEMENT"), // Platform announcements
      v.literal("ORG_NEWS"), // Org press releases
      v.literal("MATCH_REPORT"), // Auto-generated match reports
      v.literal("TOURNAMENT") // Tournament news
    ),
    // Linking
    authorId: v.id("users"),
    orgId: v.optional(v.id("organizations")), // If org press release
    tournamentId: v.optional(v.id("tournaments")),
    // Display
    isFeatured: v.optional(v.boolean()),
    featuredOrder: v.optional(v.float64()),
    // Status
    status: v.union(v.literal("DRAFT"), v.literal("PUBLISHED"), v.literal("ARCHIVED")),
    publishedAt: v.optional(v.int64()),
    // Metadata
    views: v.optional(v.float64()),
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_org", ["orgId"])
    .index("by_featured", ["isFeatured", "featuredOrder"])
    .index("by_published", ["publishedAt"]),

  /**
   * FASE 54: WORLD RANKINGS (Internal Platform Ranking)
   */
  rankings: defineTable({
    orgId: v.id("organizations"),
    week: v.string(), // "2024-W01" format
    points: v.float64(),
    rank: v.float64(),
    previousRank: v.optional(v.float64()),
    change: v.optional(v.float64()), // +2, -1, 0
    wins: v.float64(),
    losses: v.float64(),
    tournamentWins: v.optional(v.float64()),
    calculatedAt: v.int64(),
  })
    .index("by_week", ["week"])
    .index("by_org", ["orgId"])
    .index("by_week_rank", ["week", "rank"]),

  /**
   * FASE 54: MATCH VETOS (Pick & Ban System)
   */
  match_vetos: defineTable({
    matchId: v.id("matches"),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    // Teams
    team1CaptainId: v.id("users"),
    team2CaptainId: v.id("users"),
    // Veto state
    currentTurn: v.id("users"), // Whose turn
    phase: v.union(
      v.literal("BAN1"), // Team 1 ban
      v.literal("BAN2"), // Team 2 ban
      v.literal("BAN3"), // Team 1 ban
      v.literal("BAN4"), // Team 2 ban
      v.literal("PICK1"), // Team 1 pick
      v.literal("PICK2"), // Team 2 pick side
      v.literal("DECIDER"), // Last map
      v.literal("COMPLETED")
    ),
    // Veto results
    mapPool: v.array(v.string()),
    bans: v.array(v.object({
      map: v.string(),
      teamId: v.id("users"),
      timestamp: v.int64(),
    })),
    picks: v.array(v.object({
      map: v.string(),
      teamId: v.id("users"),
      side: v.optional(v.string()), // "CT" or "T"
      timestamp: v.int64(),
    })),
    selectedMap: v.optional(v.string()),
    selectedSide: v.optional(v.string()),
    // Timing
    turnDeadline: v.optional(v.int64()),
    createdAt: v.int64(),
    completedAt: v.optional(v.int64()),
  })
    .index("by_match", ["matchId"])
    .index("by_tournament_match", ["tournamentMatchId"]),

  /**
   * FASE 54: FAN VOTES (Match Predictions)
   */
  fan_votes: defineTable({
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    userId: v.id("users"),
    votedForTeam: v.float64(), // 1 or 2
    votedAt: v.int64(),
  })
    .index("by_match", ["matchId"])
    .index("by_tournament_match", ["tournamentMatchId"])
    .index("by_user", ["userId"]),

  /**
   * FASE 54: PRACC REQUESTS (Practice Finder)
   */
  praccs: defineTable({
    orgId: v.id("organizations"),
    creatorId: v.id("users"),
    // Schedule
    scheduledDate: v.int64(),
    duration: v.float64(), // minutes
    // Preferences
    map: v.optional(v.string()), // Specific map or "any"
    minElo: v.optional(v.float64()),
    maxElo: v.optional(v.float64()),
    notes: v.optional(v.string()),
    // Status
    status: v.union(
      v.literal("OPEN"), // Looking for opponent
      v.literal("MATCHED"), // Opponent found
      v.literal("CONFIRMED"), // Both confirmed
      v.literal("LIVE"), // Practice ongoing
      v.literal("FINISHED"),
      v.literal("CANCELLED")
    ),
    // Matching
    matchedOrgId: v.optional(v.id("organizations")),
    matchedAt: v.optional(v.int64()),
    // Server info
    matchId: v.optional(v.id("matches")),
    serverIp: v.optional(v.string()),
    // Metadata
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_org", ["orgId"])
    .index("by_status", ["status"])
    .index("by_date", ["scheduledDate"]),

  /**
   * FASE 54: DEMOS (Demo Storage)
   */
  demos: defineTable({
    matchId: v.optional(v.id("matches")),
    praccId: v.optional(v.id("praccs")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    // Access control
    orgIds: v.array(v.id("organizations")), // Orgs that can access
    isPublic: v.boolean(),
    // File info
    fileName: v.string(),
    fileUrl: v.string(),
    fileSize: v.optional(v.float64()), // bytes
    // Metadata
    map: v.string(),
    duration: v.optional(v.float64()), // seconds
    uploadedBy: v.id("users"),
    uploadedAt: v.int64(),
  })
    .index("by_match", ["matchId"])
    .index("by_pracc", ["praccId"])
    .index("by_org", ["orgIds"]),

  /**
   * FASE 54: LIVE MATCH TICKER
   */
  live_ticker: defineTable({
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    team1Name: v.string(),
    team2Name: v.string(),
    team1Logo: v.optional(v.string()),
    team2Logo: v.optional(v.string()),
    score1: v.float64(),
    score2: v.float64(),
    map: v.optional(v.string()),
    status: v.union(v.literal("UPCOMING"), v.literal("LIVE"), v.literal("FINISHED")),
    scheduledTime: v.optional(v.int64()),
    tournamentName: v.optional(v.string()),
    priority: v.float64(), // Higher = more important
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_status", ["status"])
    .index("by_priority", ["priority"]),

  /**
   * FASE 55: ORG DIVISIONS (Multi-Squad Structure)
   * Main Roster, Academy, Streamers, etc.
   */
  org_divisions: defineTable({
    orgId: v.id("organizations"),
    name: v.string(), // "Main Roster", "Academy", "Streamers"
    type: v.union(
      v.literal("MAIN"),
      v.literal("ACADEMY"),
      v.literal("STREAMERS"),
      v.literal("CONTENT"),
      v.literal("STAFF"),
      v.literal("CUSTOM")
    ),
    description: v.optional(v.string()),
    color: v.optional(v.string()), // Hex color for UI
    displayOrder: v.float64(),
    // Permissions
    canAccessStratbook: v.boolean(),
    canAccessMainCalendar: v.boolean(),
    // Metadata
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_type", ["orgId", "type"]),

  /**
   * FASE 55: ORG MEMBER DIVISIONS
   * Links members to divisions (players can be in multiple)
   */
  org_member_divisions: defineTable({
    orgId: v.id("organizations"),
    memberId: v.id("org_members"),
    divisionId: v.id("org_divisions"),
    isPrimary: v.boolean(), // Main division for this player
    assignedAt: v.int64(),
    assignedBy: v.id("users"),
  })
    .index("by_org", ["orgId"])
    .index("by_member", ["memberId"])
    .index("by_division", ["divisionId"]),

  /**
   * FASE 55: TEAM CALENDAR EVENTS
   * Auto-synced praccs/tournaments + manual events
   */
  org_calendar_events: defineTable({
    orgId: v.id("organizations"),
    divisionId: v.optional(v.id("org_divisions")), // If specific to a division
    // Event info
    title: v.string(),
    description: v.optional(v.string()),
    eventType: v.union(
      v.literal("PRACC"), // Auto-synced from praccs table
      v.literal("TOURNAMENT"), // Auto-synced from tournament_matches
      v.literal("SCRIM"), // Informal practice
      v.literal("TRAINING"), // Tactical training
      v.literal("VOD_REVIEW"), // Demo review session
      v.literal("MEETING"), // Team meeting
      v.literal("MEDIA"), // Content/media day
      v.literal("DAY_OFF"), // Rest day
      v.literal("OTHER")
    ),
    // Schedule
    startTime: v.int64(),
    endTime: v.optional(v.int64()),
    isAllDay: v.optional(v.boolean()),
    // Auto-sync references
    praccId: v.optional(v.id("praccs")),
    tournamentId: v.optional(v.id("tournaments")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    // Status
    status: v.union(
      v.literal("PENDING"),
      v.literal("CONFIRMED"),
      v.literal("CANCELLED"),
      v.literal("COMPLETED")
    ),
    // Attendees (optional)
    requiredMembers: v.optional(v.array(v.id("org_members"))),
    optionalMembers: v.optional(v.array(v.id("org_members"))),
    // Metadata
    createdBy: v.id("users"),
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_date", ["orgId", "startTime"])
    .index("by_division", ["divisionId"])
    .index("by_pracc", ["praccId"])
    .index("by_tournament", ["tournamentId"]),

  /**
   * FASE 55: STRATBOOK - MAP SECTIONS
   * Organize strategies by map
   */
  stratbook_maps: defineTable({
    orgId: v.id("organizations"),
    mapName: v.string(), // "mirage", "inferno", "nuke", etc.
    displayName: v.string(), // "Mirage", "Inferno", "Nuke"
    iconUrl: v.optional(v.string()),
    displayOrder: v.float64(),
    isActive: v.boolean(), // If team actively plays this map
    createdAt: v.int64(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_map", ["orgId", "mapName"]),

  /**
   * FASE 55: STRATBOOK - STRATEGIES
   * Team tactics and executes
   */
  stratbook_strategies: defineTable({
    orgId: v.id("organizations"),
    mapId: v.id("stratbook_maps"),
    divisionId: v.optional(v.id("org_divisions")), // If division-specific
    // Strategy info
    title: v.string(), // "Default A Execute", "Eco Rush B"
    category: v.union(
      v.literal("PISTOL"), // Pistol rounds
      v.literal("ECO"), // Eco rounds
      v.literal("FORCE"), // Force buy
      v.literal("FULL_BUY"), // Full buy strats
      v.literal("ANTI_ECO"), // Against eco
      v.literal("RETAKE"), // Retake setups
      v.literal("DEFAULT"), // Default plays
      v.literal("EXECUTE"), // Full site executes
      v.literal("FAKE"), // Fake strategies
      v.literal("OTHER")
    ),
    side: v.union(v.literal("T"), v.literal("CT"), v.literal("BOTH")),
    // Content
    description: v.string(), // Rich text/markdown
    videoUrl: v.optional(v.string()), // YouTube/Clip link
    imageUrl: v.optional(v.string()), // Diagram/screenshot
    // Priority
    isPrimary: v.optional(v.boolean()), // Main strategy for this scenario
    displayOrder: v.float64(),
    // Metadata
    createdBy: v.id("users"),
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_org", ["orgId"])
    .index("by_map", ["mapId"])
    .index("by_org_category", ["orgId", "category"])
    .index("by_division", ["divisionId"]),

  /**
   * FASE 55: STRATBOOK - NADES/UTILITY
   * Smoke, molotov, flash, HE lineups
   */
  stratbook_nades: defineTable({
    orgId: v.id("organizations"),
    mapId: v.id("stratbook_maps"),
    strategyId: v.optional(v.id("stratbook_strategies")), // If part of a strategy
    // Nade info
    title: v.string(), // "A Site Smoke from T Spawn"
    nadeType: v.union(
      v.literal("SMOKE"),
      v.literal("MOLOTOV"),
      v.literal("FLASH"),
      v.literal("HE"),
      v.literal("DECOY")
    ),
    side: v.union(v.literal("T"), v.literal("CT")),
    // Content
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()), // Clip showing the lineup
    imageUrl: v.optional(v.string()), // Screenshot of lineup
    thumbnailUrl: v.optional(v.string()),
    // Position info (for future map overlay feature)
    throwPosition: v.optional(v.string()), // "T Spawn", "Connector"
    landingPosition: v.optional(v.string()), // "A Site", "CT Spawn"
    // Tags for filtering
    tags: v.optional(v.array(v.string())), // ["one-way", "jumpthrow", "runboost"]
    // Metadata
    createdBy: v.id("users"),
    createdAt: v.int64(),
    updatedAt: v.optional(v.int64()),
  })
    .index("by_org", ["orgId"])
    .index("by_map", ["mapId"])
    .index("by_strategy", ["strategyId"])
    .index("by_type", ["orgId", "nadeType"]),

  /**
   * FASE 55: STRATBOOK - ANTI-STRAT NOTES
   * Intel on opponent teams
   */
  stratbook_antistrat: defineTable({
    orgId: v.id("organizations"),
    // Opponent info
    opponentOrgId: v.optional(v.id("organizations")),
    opponentName: v.string(), // Name (in case not on platform)
    // Content
    title: v.string(), // "G2 Inferno CT Side Tendencies"
    mapName: v.optional(v.string()),
    content: v.string(), // Rich text notes
    // Source
    sourceMatchId: v.optional(v.id("matches")),
    sourceDemoUrl: v.optional(v.string()),
    // Priority
    isRelevant: v.boolean(), // Still relevant or outdated
    lastUpdated: v.int64(),
    // Metadata
    createdBy: v.id("users"),
    createdAt: v.int64(),
  })
    .index("by_org", ["orgId"])
    .index("by_opponent", ["opponentOrgId"])
    .index("by_org_opponent", ["orgId", "opponentName"]),

  /**
   * FASE 56: ORGANIZATION INVITE LINKS
   * Discord-style temporary invite links
   */
  org_invite_links: defineTable({
    orgId: v.id("organizations"),
    // Link code (short unique identifier)
    code: v.string(), // "navi-82js"
    // Configuration
    expiresAt: v.optional(v.int64()), // null = never expires
    maxUses: v.optional(v.float64()), // null = unlimited
    currentUses: v.float64(),
    // Default role for joining
    defaultRole: v.union(
      v.literal("PLAYER"),
      v.literal("STAND_IN"),
      v.literal("ANALYST")
    ),
    // Metadata
    createdBy: v.id("users"),
    createdAt: v.int64(),
    isActive: v.boolean(),
  })
    .index("by_org", ["orgId"])
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  /**
   * FASE 54: WAGERS (P2P BETTING SYSTEM)
   * Play for money with automatic fund locking and settlement
   */
  wagers: defineTable({
    // Creator
    creatorId: v.id("users"),
    creatorLockedAmount: v.float64(), // Amount locked from creator
    // Opponent
    opponentId: v.optional(v.id("users")),
    opponentLockedAmount: v.optional(v.float64()),
    // Game Config
    mode: v.union(v.literal("1v1"), v.literal("2v2")),
    map: v.string(), // "aim_map", "awp_lego", etc.
    betAmount: v.float64(), // Per player (ex: 1000)
    // Pot & Fees
    totalPot: v.float64(), // Total locked (ex: 2000)
    platformFeePercent: v.float64(), // 10%
    platformFee: v.optional(v.float64()), // Calculated on settlement
    winnerPrize: v.optional(v.float64()), // 90% of pot
    // Status
    status: v.union(
      v.literal("WAITING"),    // Waiting for opponent
      v.literal("LOCKED"),     // Both paid, creating server
      v.literal("LIVE"),       // Match in progress
      v.literal("FINISHED"),   // Winner determined
      v.literal("CANCELLED"),  // Cancelled/Refunded
      v.literal("DISPUTED")    // Under admin review
    ),
    // Result
    winnerId: v.optional(v.id("users")),
    loserId: v.optional(v.id("users")),
    winnerScore: v.optional(v.float64()),
    loserScore: v.optional(v.float64()),
    // Match linking
    matchId: v.optional(v.id("matches")),
    serverIp: v.optional(v.string()),
    // Settlement
    settledAt: v.optional(v.int64()),
    settledBy: v.optional(v.union(v.literal("AUTO"), v.literal("ADMIN"))),
    // Admin intervention
    adminNote: v.optional(v.string()),
    cancelReason: v.optional(v.string()),
    // Metadata
    createdAt: v.int64(),
    expiresAt: v.int64(), // Auto-cancel timeout (10 min)
  })
    .index("by_creator", ["creatorId"])
    .index("by_opponent", ["opponentId"])
    .index("by_status", ["status"])
    .index("by_match", ["matchId"])
    .index("by_created", ["createdAt"]),

  /**
   * FASE 54: WAGER TRANSACTIONS (Financial Audit Trail)
   */
  wager_transactions: defineTable({
    wagerId: v.id("wagers"),
    userId: v.id("users"),
    type: v.union(
      v.literal("LOCK"),       // Funds locked when joining
      v.literal("UNLOCK"),     // Funds returned on cancel
      v.literal("WIN"),        // Prize credited
      v.literal("FEE"),        // Platform fee deducted
      v.literal("REFUND")      // Admin refund
    ),
    amount: v.float64(),
    balanceBefore: v.float64(),
    balanceAfter: v.float64(),
    description: v.string(),
    createdAt: v.int64(),
  })
    .index("by_wager", ["wagerId"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"]),

  /**
   * FASE 54: PLATFORM REVENUE (System Wallet)
   */
  platform_revenue: defineTable({
    source: v.union(
      v.literal("WAGER_FEE"),
      v.literal("TOURNAMENT_FEE"),
      v.literal("PREMIUM_SUB"),
      v.literal("OTHER")
    ),
    wagerId: v.optional(v.id("wagers")),
    tournamentId: v.optional(v.id("tournaments")),
    amount: v.float64(),
    description: v.string(),
    createdAt: v.int64(),
  })
    .index("by_source", ["source"])
    .index("by_date", ["createdAt"]),

  /**
   * FASE 54: PROFILE GUESTBOOK (Wall Comments)
   * Steam-style comment wall for profiles
   */
  profile_guestbook: defineTable({
    profileUserId: v.id("users"), // The profile owner
    authorId: v.id("users"), // Who wrote the comment
    content: v.string(), // "+rep", "Good aim", "Cheater"
    createdAt: v.int64(),
    isDeleted: v.optional(v.boolean()), // Soft delete by owner
  })
    .index("by_profile", ["profileUserId"])
    .index("by_author", ["authorId"])
    .index("by_profile_date", ["profileUserId", "createdAt"]),

  /**
   * FASE 54: USER SKILL STATS (Aggregated for Radar Chart)
   * Cached stats for performance - updated after each match
   */
  user_skill_stats: defineTable({
    userId: v.id("users"),
    // Core metrics (0-100 scale)
    aimScore: v.float64(), // Based on HS%
    impactScore: v.float64(), // Based on ADR
    survivalScore: v.float64(), // Inverse of deaths/round
    utilityScore: v.float64(), // Flash assists, utility damage
    clutchScore: v.float64(), // 1vX win rate
    kastScore: v.float64(), // Kill/Assist/Survive/Trade %
    // Raw stats
    totalKills: v.float64(),
    totalDeaths: v.float64(),
    totalAssists: v.float64(),
    totalHeadshots: v.float64(),
    totalDamage: v.float64(),
    totalRounds: v.float64(),
    clutchesWon: v.float64(),
    clutchesAttempted: v.float64(),
    // Calculated
    headshotPercentage: v.float64(),
    kd: v.float64(),
    adr: v.float64(),
    // Last updated
    lastUpdated: v.int64(),
  })
    .index("by_user", ["userId"]),
});
