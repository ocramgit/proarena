import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: PRACC NETWORK
 * Practice finder, instant servers, demo storage
 */

/**
 * Create a pracc request
 */
export const createPraccRequest = mutation({
  args: {
    orgId: v.id("organizations"),
    scheduledDate: v.int64(),
    duration: v.float64(), // minutes
    map: v.optional(v.string()),
    minElo: v.optional(v.float64()),
    maxElo: v.optional(v.float64()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check user is member of org
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), args.orgId),
        q.eq(q.field("isActive"), true)
      ))
      .first();

    if (!membership) throw new Error("You are not a member of this organization");

    // Check for scheduling conflicts
    const existingPracc = await ctx.db
      .query("praccs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.and(
        q.neq(q.field("status"), "FINISHED"),
        q.neq(q.field("status"), "CANCELLED")
      ))
      .first();

    if (existingPracc) {
      throw new Error("Your org already has an active pracc request");
    }

    const praccId = await ctx.db.insert("praccs", {
      orgId: args.orgId,
      creatorId: user._id,
      scheduledDate: args.scheduledDate,
      duration: args.duration,
      map: args.map,
      minElo: args.minElo,
      maxElo: args.maxElo,
      notes: args.notes,
      status: "OPEN",
      createdAt: BigInt(Date.now()),
    });

    const org = await ctx.db.get(args.orgId);
    console.log(`🎯 [PRACC] ${org?.name} looking for pracc`);

    return praccId;
  },
});

/**
 * Search for pracc opportunities
 */
export const searchPraccs = query({
  args: {
    date: v.optional(v.int64()),
    map: v.optional(v.string()),
    minElo: v.optional(v.float64()),
    maxElo: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    let praccs = await ctx.db
      .query("praccs")
      .withIndex("by_status", (q) => q.eq("status", "OPEN"))
      .collect();

    // Filter by date if provided (within 24 hours)
    if (args.date) {
      const dateStart = Number(args.date) - 12 * 60 * 60 * 1000;
      const dateEnd = Number(args.date) + 12 * 60 * 60 * 1000;
      praccs = praccs.filter(p => {
        const pDate = Number(p.scheduledDate);
        return pDate >= dateStart && pDate <= dateEnd;
      });
    }

    // Filter by map
    if (args.map) {
      praccs = praccs.filter(p => !p.map || p.map === args.map || p.map === "any");
    }

    // Enrich with org data
    return await Promise.all(praccs.map(async (pracc) => {
      const org = await ctx.db.get(pracc.orgId);
      const creator = await ctx.db.get(pracc.creatorId);

      // Get org's average ELO
      const members = await ctx.db
        .query("org_members")
        .withIndex("by_org_active", (q) => q.eq("orgId", pracc.orgId).eq("isActive", true))
        .collect();

      let avgElo = 0;
      if (members.length > 0) {
        const memberUsers = await Promise.all(members.map(m => ctx.db.get(m.userId)));
        const elos = memberUsers.filter(Boolean).map(u => u!.elo_5v5);
        avgElo = elos.length > 0 ? Math.round(elos.reduce((a, b) => a + b, 0) / elos.length) : 1000;
      }

      return {
        _id: pracc._id,
        scheduledDate: Number(pracc.scheduledDate),
        duration: pracc.duration,
        map: pracc.map,
        notes: pracc.notes,
        avgElo,
        org: org ? {
          _id: org._id,
          name: org.name,
          tag: org.tag,
          logoUrl: org.logoUrl,
          isVerified: org.isVerified,
        } : null,
        creator: creator?.nickname || creator?.steamName,
      };
    }));
  },
});

/**
 * Accept a pracc request
 */
export const acceptPracc = mutation({
  args: {
    praccId: v.id("praccs"),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check user is member of their org
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), args.orgId),
        q.eq(q.field("isActive"), true)
      ))
      .first();

    if (!membership) throw new Error("You are not a member of this organization");

    const pracc = await ctx.db.get(args.praccId);
    if (!pracc) throw new Error("Pracc not found");
    if (pracc.status !== "OPEN") throw new Error("Pracc no longer available");
    if (pracc.orgId === args.orgId) throw new Error("Cannot accept your own pracc request");

    await ctx.db.patch(args.praccId, {
      status: "MATCHED",
      matchedOrgId: args.orgId,
      matchedAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    });

    // Notify the requesting org
    const myOrg = await ctx.db.get(args.orgId);
    const theirOrg = await ctx.db.get(pracc.orgId);

    await ctx.db.insert("notifications", {
      userId: pracc.creatorId,
      title: "Pracc Aceite!",
      message: `${myOrg?.name} aceitou o teu pedido de pracc`,
      type: "SYSTEM",
      read: false,
      createdAt: BigInt(Date.now()),
    });

    console.log(`🤝 [PRACC] ${myOrg?.name} accepted pracc from ${theirOrg?.name}`);

    return { success: true };
  },
});

/**
 * Confirm pracc and start server
 */
export const confirmAndStartPracc = mutation({
  args: { praccId: v.id("praccs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const pracc = await ctx.db.get(args.praccId);
    if (!pracc) throw new Error("Pracc not found");
    if (pracc.status !== "MATCHED") throw new Error("Pracc not in matched state");

    // Check user is from one of the orgs
    const isCreator = pracc.creatorId === user._id;
    const isFromMatchedOrg = pracc.matchedOrgId && await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), pracc.matchedOrgId),
        q.eq(q.field("isActive"), true)
      ))
      .first();

    if (!isCreator && !isFromMatchedOrg) {
      throw new Error("You are not part of this pracc");
    }

    await ctx.db.patch(args.praccId, {
      status: "CONFIRMED",
      updatedAt: BigInt(Date.now()),
    });

    // Schedule server creation
    await ctx.scheduler.runAfter(0, internal.praccs.createPraccServer, {
      praccId: args.praccId,
    });

    return { success: true };
  },
});

/**
 * Create pracc server (internal)
 */
export const createPraccServer = internalAction({
  args: { praccId: v.id("praccs") },
  handler: async (ctx, args) => {
    console.log(`🖥️ [PRACC] Creating practice server for ${args.praccId}`);

    // Get pracc details
    const pracc = await ctx.runQuery(internal.praccs.getPraccInternal, { praccId: args.praccId });
    if (!pracc || !pracc.matchedOrgId) return;

    // Get members from both orgs
    const org1Members = await ctx.runQuery(internal.praccs.getOrgMembersInternal, { orgId: pracc.orgId });
    const org2Members = await ctx.runQuery(internal.praccs.getOrgMembersInternal, { orgId: pracc.matchedOrgId });

    // Collect Steam IDs for whitelist
    const allSteamIds = [
      ...org1Members.filter((m: any) => m.steamId).map((m: any) => m.steamId),
      ...org2Members.filter((m: any) => m.steamId).map((m: any) => m.steamId),
    ];

    // Create match record for the pracc
    const matchId = await ctx.runMutation(internal.praccs.createPraccMatch, {
      praccId: args.praccId,
      org1Members: org1Members.map((m: any) => m._id),
      org2Members: org2Members.map((m: any) => m._id),
      whitelistedPlayers: allSteamIds,
      map: pracc.map || "de_dust2",
    });

    // Create server via DatHost with practice config
    const playerASteamId = allSteamIds[0] || "";
    const playerBSteamId = allSteamIds[org1Members.length] || allSteamIds[1] || "";

    await ctx.runAction(internal.dathostCore.createServer, {
      matchId,
      map: pracc.map || "de_dust2",
      playerASteamId,
      playerBSteamId,
    });

    console.log(`✅ [PRACC] Server created for pracc ${args.praccId}`);
  },
});

/**
 * Internal query for pracc
 */
export const getPraccInternal = internalQuery({
  args: { praccId: v.id("praccs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.praccId);
  },
});

/**
 * Internal query for org members
 */
export const getOrgMembersInternal = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .collect();

    const users = await Promise.all(members.map(m => ctx.db.get(m.userId)));
    return users.filter(Boolean);
  },
});

/**
 * Create match for pracc
 */
export const createPraccMatch = internalMutation({
  args: {
    praccId: v.id("praccs"),
    org1Members: v.array(v.id("users")),
    org2Members: v.array(v.id("users")),
    whitelistedPlayers: v.array(v.string()),
    map: v.string(),
  },
  handler: async (ctx, args) => {
    const matchId = await ctx.db.insert("matches", {
      state: "CONFIGURING",
      mode: "5v5",
      teamA: args.org1Members,
      teamB: args.org2Members,
      mapPool: [args.map],
      bannedMaps: [],
      selectedMap: args.map,
      whitelistedPlayers: args.whitelistedPlayers,
    });

    // Link to pracc
    await ctx.db.patch(args.praccId, {
      matchId,
      status: "LIVE",
      updatedAt: BigInt(Date.now()),
    });

    // Create player stats
    for (const userId of [...args.org1Members, ...args.org2Members]) {
      await ctx.db.insert("player_stats", {
        matchId,
        userId,
        kills: 0,
        deaths: 0,
        assists: 0,
        mvps: 0,
        connected: false,
      });
    }

    return matchId;
  },
});

/**
 * Cancel pracc request
 */
export const cancelPracc = mutation({
  args: { praccId: v.id("praccs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const pracc = await ctx.db.get(args.praccId);
    if (!pracc) throw new Error("Pracc not found");
    if (pracc.creatorId !== user._id) throw new Error("Only creator can cancel");
    if (pracc.status === "LIVE" || pracc.status === "FINISHED") {
      throw new Error("Cannot cancel pracc in progress or finished");
    }

    await ctx.db.patch(args.praccId, {
      status: "CANCELLED",
      updatedAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Get my org's praccs
 */
export const getMyOrgPraccs = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const praccs = await ctx.db
      .query("praccs")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(20);

    return await Promise.all(praccs.map(async (pracc) => {
      let opponent = null;
      if (pracc.matchedOrgId) {
        const org = await ctx.db.get(pracc.matchedOrgId);
        opponent = org ? { name: org.name, tag: org.tag, logoUrl: org.logoUrl } : null;
      }

      return {
        ...pracc,
        scheduledDate: Number(pracc.scheduledDate),
        createdAt: Number(pracc.createdAt),
        opponent,
      };
    }));
  },
});

/**
 * Upload demo after pracc
 */
export const uploadDemo = mutation({
  args: {
    praccId: v.optional(v.id("praccs")),
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    fileName: v.string(),
    fileUrl: v.string(),
    fileSize: v.optional(v.float64()),
    map: v.string(),
    duration: v.optional(v.float64()),
    orgIds: v.array(v.id("organizations")),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const demoId = await ctx.db.insert("demos", {
      praccId: args.praccId,
      matchId: args.matchId,
      tournamentMatchId: args.tournamentMatchId,
      fileName: args.fileName,
      fileUrl: args.fileUrl,
      fileSize: args.fileSize,
      map: args.map,
      duration: args.duration,
      orgIds: args.orgIds,
      isPublic: args.isPublic || false,
      uploadedBy: user._id,
      uploadedAt: BigInt(Date.now()),
    });

    console.log(`📼 [DEMO] Uploaded: ${args.fileName}`);
    return demoId;
  },
});

/**
 * Get demos for org
 */
export const getOrgDemos = query({
  args: { 
    orgId: v.id("organizations"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    // Get demos where org has access
    const demos = await ctx.db
      .query("demos")
      .order("desc")
      .take(100);

    // Filter by org access
    const filtered = demos
      .filter(d => d.orgIds.includes(args.orgId) || d.isPublic)
      .slice(0, limit);

    return filtered.map(d => ({
      _id: d._id,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      map: d.map,
      duration: d.duration,
      isPublic: d.isPublic,
      uploadedAt: Number(d.uploadedAt),
    }));
  },
});

/**
 * Get demo by ID
 */
export const getDemo = query({
  args: { demoId: v.id("demos") },
  handler: async (ctx, args) => {
    const demo = await ctx.db.get(args.demoId);
    if (!demo) return null;

    const uploader = await ctx.db.get(demo.uploadedBy);

    return {
      ...demo,
      uploadedAt: Number(demo.uploadedAt),
      uploadedBy: uploader ? {
        nickname: uploader.nickname,
        steamAvatar: uploader.steamAvatar,
      } : null,
    };
  },
});
