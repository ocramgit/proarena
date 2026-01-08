import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: ORGANIZATION HUB
 * Full organization management system
 */

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "marstrabalhar@gmail.com";

// Helper to check if user can manage org
async function canManageOrg(ctx: any, orgId: Id<"organizations">): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) return false;

  // Super admin can manage all
  if (identity.email === SUPER_ADMIN_EMAIL) return true;

  const org = await ctx.db.get(orgId);
  if (!org) return false;

  // Owner can manage
  if (org.ownerId === user._id) return true;

  // Manager can manage
  if (org.managersIds?.includes(user._id)) return true;

  return false;
}

/**
 * Create a new organization
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    tag: v.string(),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check if tag is unique
    const existingTag = await ctx.db
      .query("organizations")
      .withIndex("by_tag", (q) => q.eq("tag", args.tag.toUpperCase()))
      .first();
    if (existingTag) throw new Error("Tag already in use");

    // Check if user already owns an org
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();
    if (existingOrg) throw new Error("You already own an organization");

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      tag: args.tag.toUpperCase(),
      description: args.description,
      logoUrl: args.logoUrl,
      bannerUrl: args.bannerUrl,
      ownerId: user._id,
      totalWins: 0,
      totalLosses: 0,
      rankingPoints: 0,
      createdAt: BigInt(Date.now()),
    });

    // Add owner as member
    await ctx.db.insert("org_members", {
      orgId,
      userId: user._id,
      role: "OWNER",
      joinedAt: BigInt(Date.now()),
      isActive: true,
    });

    console.log(`🏢 Organization created: ${args.name} [${args.tag}]`);
    return orgId;
  },
});

/**
 * Update organization details
 */
export const updateOrganization = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    discordUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const canManage = await canManageOrg(ctx, args.orgId);
    if (!canManage) throw new Error("Acesso negado");

    const { orgId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    await ctx.db.patch(orgId, {
      ...cleanUpdates,
      updatedAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Get organization by ID with full details
 */
export const getOrganization = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return null;

    // Get owner info
    const owner = await ctx.db.get(org.ownerId);

    // Get active roster
    const roster = await ctx.db
      .query("org_members")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .collect();

    // Enrich roster with user data
    const enrichedRoster = await Promise.all(
      roster.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user: user ? {
            _id: user._id,
            nickname: user.nickname,
            steamName: user.steamName,
            steamAvatar: user.steamAvatar,
            elo_5v5: user.elo_5v5,
          } : null,
        };
      })
    );

    // Get sponsors
    const sponsors = await ctx.db
      .query("org_sponsors")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get recent matches (last 10)
    const matches = await ctx.db
      .query("org_matches")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(10);

    // Get org news
    const news = await ctx.db
      .query("articles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .order("desc")
      .take(5);

    // Calculate stats
    const totalMatches = (org.totalWins || 0) + (org.totalLosses || 0);
    const winRate = totalMatches > 0 ? ((org.totalWins || 0) / totalMatches) * 100 : 0;

    return {
      ...org,
      createdAt: Number(org.createdAt),
      owner,
      roster: enrichedRoster,
      sponsors: sponsors.sort((a, b) => a.displayOrder - b.displayOrder),
      recentMatches: matches.map(m => ({ ...m, playedAt: Number(m.playedAt) })),
      news: news.map(n => ({ ...n, publishedAt: n.publishedAt ? Number(n.publishedAt) : null })),
      stats: {
        totalWins: org.totalWins || 0,
        totalLosses: org.totalLosses || 0,
        winRate: winRate.toFixed(1),
        rankingPoints: org.rankingPoints || 0,
        currentRank: org.currentRank,
      },
    };
  },
});

/**
 * Get organization by tag
 */
export const getOrganizationByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_tag", (q) => q.eq("tag", args.tag.toUpperCase()))
      .first();
    
    if (!org) return null;

    // Reuse getOrganization logic by calling it internally
    return ctx.db.get(org._id);
  },
});

/**
 * List all organizations (for discovery)
 */
export const listOrganizations = query({
  args: {
    limit: v.optional(v.float64()),
    sortBy: v.optional(v.union(v.literal("rank"), v.literal("recent"), v.literal("name"))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let orgs = await ctx.db
      .query("organizations")
      .order("desc")
      .take(limit);

    // Sort by ranking points if requested
    if (args.sortBy === "rank") {
      orgs = orgs.sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0));
    }

    // Enrich with basic stats
    return await Promise.all(orgs.map(async (org) => {
      const memberCount = await ctx.db
        .query("org_members")
        .withIndex("by_org_active", (q) => q.eq("orgId", org._id).eq("isActive", true))
        .collect();

      return {
        _id: org._id,
        name: org.name,
        tag: org.tag,
        logoUrl: org.logoUrl,
        isVerified: org.isVerified,
        memberCount: memberCount.length,
        rankingPoints: org.rankingPoints || 0,
        currentRank: org.currentRank,
        totalWins: org.totalWins || 0,
        totalLosses: org.totalLosses || 0,
      };
    }));
  },
});

/**
 * Invite player to organization
 */
export const invitePlayer = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("PLAYER"), v.literal("COACH"), v.literal("ANALYST")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const canManage = await canManageOrg(ctx, args.orgId);
    if (!canManage) throw new Error("Acesso negado");

    // Check if already a member
    const existing = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), args.orgId),
        q.eq(q.field("isActive"), true)
      ))
      .first();
    if (existing) throw new Error("User is already a member");

    // Check for pending invite
    const pendingInvite = await ctx.db
      .query("org_invites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), args.orgId),
        q.eq(q.field("status"), "PENDING"),
        q.eq(q.field("type"), "INVITE")
      ))
      .first();
    if (pendingInvite) throw new Error("Invite already pending");

    const inviteId = await ctx.db.insert("org_invites", {
      orgId: args.orgId,
      userId: args.userId,
      type: "INVITE",
      role: args.role,
      message: args.message,
      status: "PENDING",
      createdAt: BigInt(Date.now()),
    });

    // Create notification
    const org = await ctx.db.get(args.orgId);
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Convite de Organização",
      message: `${org?.name} convidou-te para te juntares como ${args.role}`,
      type: "SYSTEM",
      read: false,
      createdAt: BigInt(Date.now()),
    });

    return inviteId;
  },
});

/**
 * Apply to join organization
 */
export const applyToOrganization = mutation({
  args: {
    orgId: v.id("organizations"),
    role: v.union(v.literal("PLAYER"), v.literal("COACH"), v.literal("ANALYST")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check if already a member
    const existing = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), args.orgId),
        q.eq(q.field("isActive"), true)
      ))
      .first();
    if (existing) throw new Error("Already a member");

    // Check for pending application
    const pendingApp = await ctx.db
      .query("org_invites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("orgId"), args.orgId),
        q.eq(q.field("status"), "PENDING"),
        q.eq(q.field("type"), "APPLICATION")
      ))
      .first();
    if (pendingApp) throw new Error("Application already pending");

    await ctx.db.insert("org_invites", {
      orgId: args.orgId,
      userId: user._id,
      type: "APPLICATION",
      role: args.role,
      message: args.message,
      status: "PENDING",
      createdAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Respond to invite/application
 */
export const respondToInvite = mutation({
  args: {
    inviteId: v.id("org_invites"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    if (invite.status !== "PENDING") throw new Error("Invite already processed");

    // Check permission
    const isInvitee = invite.userId === user._id && invite.type === "INVITE";
    const isManager = invite.type === "APPLICATION" && await canManageOrg(ctx, invite.orgId);

    if (!isInvitee && !isManager) throw new Error("Acesso negado");

    await ctx.db.patch(args.inviteId, {
      status: args.accept ? "ACCEPTED" : "REJECTED",
      respondedAt: BigInt(Date.now()),
    });

    if (args.accept) {
      // Add as member
      await ctx.db.insert("org_members", {
        orgId: invite.orgId,
        userId: invite.userId,
        role: invite.role,
        joinedAt: BigInt(Date.now()),
        isActive: true,
      });
    }

    return { success: true };
  },
});

/**
 * Update member role
 */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id("org_members"),
    role: v.union(
      v.literal("MANAGER"),
      v.literal("CAPTAIN"),
      v.literal("PLAYER"),
      v.literal("COACH"),
      v.literal("ANALYST"),
      v.literal("BENCH")
    ),
    gameRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const canManage = await canManageOrg(ctx, member.orgId);
    if (!canManage) throw new Error("Acesso negado");

    await ctx.db.patch(args.memberId, {
      role: args.role,
      gameRole: args.gameRole,
    });

    // Update managers array if needed
    if (args.role === "MANAGER") {
      const org = await ctx.db.get(member.orgId);
      if (org && !org.managersIds?.includes(member.userId)) {
        await ctx.db.patch(member.orgId, {
          managersIds: [...(org.managersIds || []), member.userId],
        });
      }
    }

    return { success: true };
  },
});

/**
 * Remove member from organization
 */
export const removeMember = mutation({
  args: {
    memberId: v.id("org_members"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    // Owner cannot be removed
    if (member.role === "OWNER") throw new Error("Cannot remove owner");

    const canManage = await canManageOrg(ctx, member.orgId);
    if (!canManage) throw new Error("Acesso negado");

    await ctx.db.patch(args.memberId, {
      isActive: false,
      leftAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Add sponsor
 */
export const addSponsor = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    tier: v.union(v.literal("MAIN"), v.literal("PARTNER"), v.literal("SUPPORTER")),
  },
  handler: async (ctx, args) => {
    const canManage = await canManageOrg(ctx, args.orgId);
    if (!canManage) throw new Error("Acesso negado");

    // Get current sponsor count for ordering
    const sponsors = await ctx.db
      .query("org_sponsors")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    await ctx.db.insert("org_sponsors", {
      orgId: args.orgId,
      name: args.name,
      logoUrl: args.logoUrl,
      websiteUrl: args.websiteUrl,
      tier: args.tier,
      displayOrder: sponsors.length + 1,
      createdAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Remove sponsor
 */
export const removeSponsor = mutation({
  args: { sponsorId: v.id("org_sponsors") },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");

    const canManage = await canManageOrg(ctx, sponsor.orgId);
    if (!canManage) throw new Error("Acesso negado");

    await ctx.db.delete(args.sponsorId);
    return { success: true };
  },
});

/**
 * Get user's organization
 */
export const getMyOrganization = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    // Check if owner
    const ownedOrg = await ctx.db
      .query("organizations")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .first();
    if (ownedOrg) return { ...ownedOrg, role: "OWNER" };

    // Check if member
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (membership) {
      const org = await ctx.db.get(membership.orgId);
      return org ? { ...org, role: membership.role } : null;
    }

    return null;
  },
});

/**
 * Get pending invites for user
 */
export const getMyInvites = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const invites = await ctx.db
      .query("org_invites")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.and(
        q.eq(q.field("status"), "PENDING"),
        q.eq(q.field("type"), "INVITE")
      ))
      .collect();

    return await Promise.all(invites.map(async (invite) => {
      const org = await ctx.db.get(invite.orgId);
      return {
        ...invite,
        createdAt: Number(invite.createdAt),
        org: org ? { name: org.name, tag: org.tag, logoUrl: org.logoUrl } : null,
      };
    }));
  },
});

/**
 * Check if user can manage org
 */
export const canManage = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await canManageOrg(ctx, args.orgId);
  },
});
