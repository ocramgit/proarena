import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 55: STRATBOOK - PRIVATE TACTICAL REPOSITORY
 * Maps, Strategies, Nades, Anti-Strat notes
 */

// Check if user has stratbook access
async function hasStratbookAccess(ctx: any, orgId: Id<"organizations">): Promise<{
  hasAccess: boolean;
  user: any;
  member: any;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { hasAccess: false, user: null, member: null };

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) return { hasAccess: false, user: null, member: null };

  // Must be active member
  const member = await ctx.db
    .query("org_members")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .filter((q: any) => q.eq(q.field("orgId"), orgId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .first();

  if (!member) return { hasAccess: false, user, member: null };

  // Check division permissions
  const memberDivisions = await ctx.db
    .query("org_member_divisions")
    .withIndex("by_member", (q: any) => q.eq("memberId", member._id))
    .collect();

  // If no divisions assigned, default to having access (legacy support)
  if (memberDivisions.length === 0) {
    return { hasAccess: true, user, member };
  }

  // Check if any division has stratbook access
  for (const md of memberDivisions) {
    const division = await ctx.db.get(md.divisionId);
    if (division?.canAccessStratbook) {
      return { hasAccess: true, user, member };
    }
  }

  return { hasAccess: false, user, member };
}

// ============================================
// MAPS
// ============================================

/**
 * Get stratbook maps for org
 */
export const getMaps = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { hasAccess } = await hasStratbookAccess(ctx, args.orgId);
    if (!hasAccess) return [];

    const maps = await ctx.db
      .query("stratbook_maps")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get strategy and nade counts
    return await Promise.all(maps.map(async (map) => {
      const strategies = await ctx.db
        .query("stratbook_strategies")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();

      const nades = await ctx.db
        .query("stratbook_nades")
        .withIndex("by_map", (q) => q.eq("mapId", map._id))
        .collect();

      return {
        ...map,
        strategyCount: strategies.length,
        nadeCount: nades.length,
        createdAt: Number(map.createdAt),
      };
    }));
  },
});

/**
 * Initialize default maps for org
 */
export const initializeMaps = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { hasAccess, user } = await hasStratbookAccess(ctx, args.orgId);
    if (!hasAccess) throw new Error("Acesso negado ao Stratbook");

    // Check if maps already exist
    const existing = await ctx.db
      .query("stratbook_maps")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .first();

    if (existing) return; // Already initialized

    const defaultMaps = [
      { mapName: "mirage", displayName: "Mirage", order: 1 },
      { mapName: "inferno", displayName: "Inferno", order: 2 },
      { mapName: "nuke", displayName: "Nuke", order: 3 },
      { mapName: "ancient", displayName: "Ancient", order: 4 },
      { mapName: "anubis", displayName: "Anubis", order: 5 },
      { mapName: "vertigo", displayName: "Vertigo", order: 6 },
      { mapName: "dust2", displayName: "Dust II", order: 7 },
    ];

    for (const map of defaultMaps) {
      await ctx.db.insert("stratbook_maps", {
        orgId: args.orgId,
        mapName: map.mapName,
        displayName: map.displayName,
        displayOrder: map.order,
        isActive: true,
        createdAt: BigInt(Date.now()),
      });
    }

    console.log(`📚 Stratbook initialized for org ${args.orgId}`);
  },
});

/**
 * Toggle map active status
 */
export const toggleMapActive = mutation({
  args: {
    mapId: v.id("stratbook_maps"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    const { hasAccess } = await hasStratbookAccess(ctx, map.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    await ctx.db.patch(args.mapId, { isActive: args.isActive });
  },
});

// ============================================
// STRATEGIES
// ============================================

/**
 * Get strategies for a map
 */
export const getStrategies = query({
  args: { mapId: v.id("stratbook_maps") },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) return [];

    const { hasAccess } = await hasStratbookAccess(ctx, map.orgId);
    if (!hasAccess) return [];

    const strategies = await ctx.db
      .query("stratbook_strategies")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();

    return await Promise.all(strategies.map(async (strat) => {
      const creator = await ctx.db.get(strat.createdBy);
      return {
        ...strat,
        createdAt: Number(strat.createdAt),
        updatedAt: strat.updatedAt ? Number(strat.updatedAt) : null,
        createdByName: creator?.nickname || creator?.steamName || "Unknown",
      };
    }));
  },
});

/**
 * Create strategy
 */
export const createStrategy = mutation({
  args: {
    mapId: v.id("stratbook_maps"),
    title: v.string(),
    category: v.union(
      v.literal("PISTOL"),
      v.literal("ECO"),
      v.literal("FORCE"),
      v.literal("FULL_BUY"),
      v.literal("ANTI_ECO"),
      v.literal("RETAKE"),
      v.literal("DEFAULT"),
      v.literal("EXECUTE"),
      v.literal("FAKE"),
      v.literal("OTHER")
    ),
    side: v.union(v.literal("T"), v.literal("CT"), v.literal("BOTH")),
    description: v.string(),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    const { hasAccess, user } = await hasStratbookAccess(ctx, map.orgId);
    if (!hasAccess || !user) throw new Error("Acesso negado ao Stratbook");

    const strategies = await ctx.db
      .query("stratbook_strategies")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();

    return await ctx.db.insert("stratbook_strategies", {
      orgId: map.orgId,
      mapId: args.mapId,
      title: args.title,
      category: args.category,
      side: args.side,
      description: args.description,
      videoUrl: args.videoUrl,
      imageUrl: args.imageUrl,
      isPrimary: args.isPrimary,
      displayOrder: strategies.length,
      createdBy: user._id,
      createdAt: BigInt(Date.now()),
    });
  },
});

/**
 * Update strategy
 */
export const updateStrategy = mutation({
  args: {
    strategyId: v.id("stratbook_strategies"),
    title: v.optional(v.string()),
    category: v.optional(v.union(
      v.literal("PISTOL"),
      v.literal("ECO"),
      v.literal("FORCE"),
      v.literal("FULL_BUY"),
      v.literal("ANTI_ECO"),
      v.literal("RETAKE"),
      v.literal("DEFAULT"),
      v.literal("EXECUTE"),
      v.literal("FAKE"),
      v.literal("OTHER")
    )),
    side: v.optional(v.union(v.literal("T"), v.literal("CT"), v.literal("BOTH"))),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const { hasAccess } = await hasStratbookAccess(ctx, strategy.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    await ctx.db.patch(args.strategyId, {
      ...(args.title && { title: args.title }),
      ...(args.category && { category: args.category }),
      ...(args.side && { side: args.side }),
      ...(args.description && { description: args.description }),
      ...(args.videoUrl !== undefined && { videoUrl: args.videoUrl }),
      ...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
      ...(args.isPrimary !== undefined && { isPrimary: args.isPrimary }),
      updatedAt: BigInt(Date.now()),
    });
  },
});

/**
 * Delete strategy
 */
export const deleteStrategy = mutation({
  args: { strategyId: v.id("stratbook_strategies") },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) throw new Error("Strategy not found");

    const { hasAccess } = await hasStratbookAccess(ctx, strategy.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    // Delete associated nades
    const nades = await ctx.db
      .query("stratbook_nades")
      .withIndex("by_strategy", (q) => q.eq("strategyId", args.strategyId))
      .collect();

    for (const nade of nades) {
      await ctx.db.delete(nade._id);
    }

    await ctx.db.delete(args.strategyId);
  },
});

// ============================================
// NADES
// ============================================

/**
 * Get nades for a map
 */
export const getNades = query({
  args: { mapId: v.id("stratbook_maps") },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) return [];

    const { hasAccess } = await hasStratbookAccess(ctx, map.orgId);
    if (!hasAccess) return [];

    const nades = await ctx.db
      .query("stratbook_nades")
      .withIndex("by_map", (q) => q.eq("mapId", args.mapId))
      .collect();

    return await Promise.all(nades.map(async (nade) => {
      const creator = await ctx.db.get(nade.createdBy);
      return {
        ...nade,
        createdAt: Number(nade.createdAt),
        updatedAt: nade.updatedAt ? Number(nade.updatedAt) : null,
        createdByName: creator?.nickname || creator?.steamName || "Unknown",
      };
    }));
  },
});

/**
 * Create nade
 */
export const createNade = mutation({
  args: {
    mapId: v.id("stratbook_maps"),
    strategyId: v.optional(v.id("stratbook_strategies")),
    title: v.string(),
    nadeType: v.union(
      v.literal("SMOKE"),
      v.literal("MOLOTOV"),
      v.literal("FLASH"),
      v.literal("HE"),
      v.literal("DECOY")
    ),
    side: v.union(v.literal("T"), v.literal("CT")),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    throwPosition: v.optional(v.string()),
    landingPosition: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const map = await ctx.db.get(args.mapId);
    if (!map) throw new Error("Map not found");

    const { hasAccess, user } = await hasStratbookAccess(ctx, map.orgId);
    if (!hasAccess || !user) throw new Error("Acesso negado ao Stratbook");

    return await ctx.db.insert("stratbook_nades", {
      orgId: map.orgId,
      mapId: args.mapId,
      strategyId: args.strategyId,
      title: args.title,
      nadeType: args.nadeType,
      side: args.side,
      description: args.description,
      videoUrl: args.videoUrl,
      imageUrl: args.imageUrl,
      throwPosition: args.throwPosition,
      landingPosition: args.landingPosition,
      tags: args.tags,
      createdBy: user._id,
      createdAt: BigInt(Date.now()),
    });
  },
});

/**
 * Update nade
 */
export const updateNade = mutation({
  args: {
    nadeId: v.id("stratbook_nades"),
    title: v.optional(v.string()),
    nadeType: v.optional(v.union(
      v.literal("SMOKE"),
      v.literal("MOLOTOV"),
      v.literal("FLASH"),
      v.literal("HE"),
      v.literal("DECOY")
    )),
    side: v.optional(v.union(v.literal("T"), v.literal("CT"))),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    throwPosition: v.optional(v.string()),
    landingPosition: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const nade = await ctx.db.get(args.nadeId);
    if (!nade) throw new Error("Nade not found");

    const { hasAccess } = await hasStratbookAccess(ctx, nade.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    await ctx.db.patch(args.nadeId, {
      ...(args.title && { title: args.title }),
      ...(args.nadeType && { nadeType: args.nadeType }),
      ...(args.side && { side: args.side }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.videoUrl !== undefined && { videoUrl: args.videoUrl }),
      ...(args.imageUrl !== undefined && { imageUrl: args.imageUrl }),
      ...(args.throwPosition !== undefined && { throwPosition: args.throwPosition }),
      ...(args.landingPosition !== undefined && { landingPosition: args.landingPosition }),
      ...(args.tags !== undefined && { tags: args.tags }),
      updatedAt: BigInt(Date.now()),
    });
  },
});

/**
 * Delete nade
 */
export const deleteNade = mutation({
  args: { nadeId: v.id("stratbook_nades") },
  handler: async (ctx, args) => {
    const nade = await ctx.db.get(args.nadeId);
    if (!nade) throw new Error("Nade not found");

    const { hasAccess } = await hasStratbookAccess(ctx, nade.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    await ctx.db.delete(args.nadeId);
  },
});

// ============================================
// ANTI-STRAT
// ============================================

/**
 * Get anti-strat notes for org
 */
export const getAntiStrats = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { hasAccess } = await hasStratbookAccess(ctx, args.orgId);
    if (!hasAccess) return [];

    const notes = await ctx.db
      .query("stratbook_antistrat")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return await Promise.all(notes.map(async (note) => {
      const creator = await ctx.db.get(note.createdBy);
      return {
        ...note,
        createdAt: Number(note.createdAt),
        lastUpdated: Number(note.lastUpdated),
        createdByName: creator?.nickname || creator?.steamName || "Unknown",
      };
    }));
  },
});

/**
 * Create anti-strat note
 */
export const createAntiStrat = mutation({
  args: {
    orgId: v.id("organizations"),
    opponentOrgId: v.optional(v.id("organizations")),
    opponentName: v.string(),
    title: v.string(),
    mapName: v.optional(v.string()),
    content: v.string(),
    sourceDemoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { hasAccess, user } = await hasStratbookAccess(ctx, args.orgId);
    if (!hasAccess || !user) throw new Error("Acesso negado ao Stratbook");

    return await ctx.db.insert("stratbook_antistrat", {
      orgId: args.orgId,
      opponentOrgId: args.opponentOrgId,
      opponentName: args.opponentName,
      title: args.title,
      mapName: args.mapName,
      content: args.content,
      sourceDemoUrl: args.sourceDemoUrl,
      isRelevant: true,
      lastUpdated: BigInt(Date.now()),
      createdBy: user._id,
      createdAt: BigInt(Date.now()),
    });
  },
});

/**
 * Update anti-strat note
 */
export const updateAntiStrat = mutation({
  args: {
    noteId: v.id("stratbook_antistrat"),
    title: v.optional(v.string()),
    mapName: v.optional(v.string()),
    content: v.optional(v.string()),
    sourceDemoUrl: v.optional(v.string()),
    isRelevant: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    const { hasAccess } = await hasStratbookAccess(ctx, note.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    await ctx.db.patch(args.noteId, {
      ...(args.title && { title: args.title }),
      ...(args.mapName !== undefined && { mapName: args.mapName }),
      ...(args.content && { content: args.content }),
      ...(args.sourceDemoUrl !== undefined && { sourceDemoUrl: args.sourceDemoUrl }),
      ...(args.isRelevant !== undefined && { isRelevant: args.isRelevant }),
      lastUpdated: BigInt(Date.now()),
    });
  },
});

/**
 * Delete anti-strat note
 */
export const deleteAntiStrat = mutation({
  args: { noteId: v.id("stratbook_antistrat") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    const { hasAccess } = await hasStratbookAccess(ctx, note.orgId);
    if (!hasAccess) throw new Error("Acesso negado");

    await ctx.db.delete(args.noteId);
  },
});
