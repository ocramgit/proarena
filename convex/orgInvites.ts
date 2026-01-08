import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 56: ADVANCED ORG INVITE SYSTEM
 * Discord-style invite links + Direct invites
 */

// Role permission hierarchy
const ROLE_HIERARCHY = {
  OWNER: 100,
  MANAGER: 80,
  COACH: 60,
  CAPTAIN: 50,
  PLAYER: 40,
  ANALYST: 30,
  BENCH: 20,
  STAND_IN: 10,
};

// Permission matrix
export const ROLE_PERMISSIONS = {
  OWNER: {
    canManageFinances: true,
    canDeleteOrg: true,
    canManageRoster: true,
    canInviteMembers: true,
    canCreateInviteLinks: true,
    canManagePraccs: true,
    canAccessStratbook: true,
    canManageStratbook: true,
    canDoMapVeto: true,
    canSpectate: true,
  },
  MANAGER: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: true,
    canInviteMembers: true,
    canCreateInviteLinks: true,
    canManagePraccs: true,
    canAccessStratbook: true,
    canManageStratbook: false,
    canDoMapVeto: false,
    canSpectate: true,
  },
  COACH: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: false,
    canInviteMembers: false,
    canCreateInviteLinks: false,
    canManagePraccs: false,
    canAccessStratbook: true,
    canManageStratbook: true,
    canDoMapVeto: false,
    canSpectate: true,
  },
  CAPTAIN: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: false,
    canInviteMembers: false,
    canCreateInviteLinks: false,
    canManagePraccs: true,
    canAccessStratbook: true,
    canManageStratbook: false,
    canDoMapVeto: true,
    canSpectate: false,
  },
  PLAYER: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: false,
    canInviteMembers: false,
    canCreateInviteLinks: false,
    canManagePraccs: false,
    canAccessStratbook: true,
    canManageStratbook: false,
    canDoMapVeto: false,
    canSpectate: false,
  },
  ANALYST: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: false,
    canInviteMembers: false,
    canCreateInviteLinks: false,
    canManagePraccs: false,
    canAccessStratbook: true,
    canManageStratbook: false,
    canDoMapVeto: false,
    canSpectate: true,
  },
  BENCH: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: false,
    canInviteMembers: false,
    canCreateInviteLinks: false,
    canManagePraccs: false,
    canAccessStratbook: true,
    canManageStratbook: false,
    canDoMapVeto: false,
    canSpectate: false,
  },
  STAND_IN: {
    canManageFinances: false,
    canDeleteOrg: false,
    canManageRoster: false,
    canInviteMembers: false,
    canCreateInviteLinks: false,
    canManagePraccs: false,
    canAccessStratbook: false, // NO stratbook for stand-ins
    canManageStratbook: false,
    canDoMapVeto: false,
    canSpectate: false,
  },
};

// Generate random invite code
function generateInviteCode(tag: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${tag.toLowerCase()}-${suffix}`;
}

/**
 * Get my permissions in an org
 */
export const getMyPermissions = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const member = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!member) return null;

    return {
      role: member.role,
      permissions: ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS],
      hierarchyLevel: ROLE_HIERARCHY[member.role as keyof typeof ROLE_HIERARCHY],
    };
  },
});

/**
 * Create invite link
 */
export const createInviteLink = mutation({
  args: {
    orgId: v.id("organizations"),
    expiresIn: v.optional(v.union(
      v.literal("30m"),
      v.literal("1h"),
      v.literal("24h"),
      v.literal("7d"),
      v.literal("never")
    )),
    maxUses: v.optional(v.float64()),
    defaultRole: v.union(
      v.literal("PLAYER"),
      v.literal("STAND_IN"),
      v.literal("ANALYST")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check permission
    const member = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!member) throw new Error("Not a member of this organization");

    const permissions = ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions?.canCreateInviteLinks) {
      throw new Error("No permission to create invite links");
    }

    // Get org for tag
    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    // Calculate expiration
    let expiresAt: bigint | undefined;
    const now = Date.now();
    switch (args.expiresIn) {
      case "30m": expiresAt = BigInt(now + 30 * 60 * 1000); break;
      case "1h": expiresAt = BigInt(now + 60 * 60 * 1000); break;
      case "24h": expiresAt = BigInt(now + 24 * 60 * 60 * 1000); break;
      case "7d": expiresAt = BigInt(now + 7 * 24 * 60 * 60 * 1000); break;
      case "never": expiresAt = undefined; break;
      default: expiresAt = BigInt(now + 24 * 60 * 60 * 1000);
    }

    // Generate unique code
    let code = generateInviteCode(org.tag);
    let existing = await ctx.db
      .query("org_invite_links")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    while (existing) {
      code = generateInviteCode(org.tag);
      existing = await ctx.db
        .query("org_invite_links")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const linkId = await ctx.db.insert("org_invite_links", {
      orgId: args.orgId,
      code,
      expiresAt,
      maxUses: args.maxUses,
      currentUses: 0,
      defaultRole: args.defaultRole,
      createdBy: user._id,
      createdAt: BigInt(now),
      isActive: true,
    });

    console.log(`🔗 [INVITE] Created link ${code} for org ${org.tag}`);

    return { linkId, code, fullUrl: `proarena.gg/invite/${code}` };
  },
});

/**
 * Get invite links for an org
 */
export const getInviteLinks = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    // Check if member with permission
    const member = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!member) return [];

    const permissions = ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions?.canCreateInviteLinks) return [];

    const links = await ctx.db
      .query("org_invite_links")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Add creator info
    const enriched = await Promise.all(
      links.map(async (link) => {
        const creator = await ctx.db.get(link.createdBy);
        const isExpired = link.expiresAt && Number(link.expiresAt) < Date.now();
        const isMaxedOut = link.maxUses && link.currentUses >= link.maxUses;
        return {
          ...link,
          creatorName: creator?.nickname || creator?.steamName,
          isValid: link.isActive && !isExpired && !isMaxedOut,
        };
      })
    );

    return enriched;
  },
});

/**
 * Delete/revoke invite link
 */
export const revokeInviteLink = mutation({
  args: { linkId: v.id("org_invite_links") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const link = await ctx.db.get(args.linkId);
    if (!link) throw new Error("Link not found");

    // Check permission
    const member = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), link.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!member) throw new Error("Not a member");

    const permissions = ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions?.canCreateInviteLinks) {
      throw new Error("No permission");
    }

    await ctx.db.patch(args.linkId, { isActive: false });

    console.log(`🔗 [INVITE] Revoked link ${link.code}`);
  },
});

/**
 * Join org via invite link
 */
export const joinViaInviteLink = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Find link
    const link = await ctx.db
      .query("org_invite_links")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!link) throw new Error("Link de convite inválido");
    if (!link.isActive) throw new Error("Link de convite foi revogado");
    if (link.expiresAt && Number(link.expiresAt) < Date.now()) {
      throw new Error("Link de convite expirou");
    }
    if (link.maxUses && link.currentUses >= link.maxUses) {
      throw new Error("Link atingiu o máximo de utilizações");
    }

    // Check if already member
    const existingMember = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), link.orgId))
      .first();

    if (existingMember?.isActive) {
      throw new Error("Já és membro desta organização");
    }

    const org = await ctx.db.get(link.orgId);
    if (!org) throw new Error("Organização não encontrada");

    // Join or reactivate
    if (existingMember) {
      await ctx.db.patch(existingMember._id, {
        role: link.defaultRole,
        isActive: true,
        joinedAt: BigInt(Date.now()),
        leftAt: undefined,
      });
    } else {
      await ctx.db.insert("org_members", {
        orgId: link.orgId,
        userId: user._id,
        role: link.defaultRole,
        joinedAt: BigInt(Date.now()),
        isActive: true,
      });
    }

    // Increment link usage
    await ctx.db.patch(link._id, { currentUses: link.currentUses + 1 });

    console.log(`🎉 [INVITE] ${user.nickname} joined ${org.tag} via link ${args.code}`);

    return { orgId: link.orgId, orgName: org.name, orgTag: org.tag };
  },
});

/**
 * Get link info (public)
 */
export const getInviteLinkInfo = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("org_invite_links")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!link) return null;

    const org = await ctx.db.get(link.orgId);
    if (!org) return null;

    const isExpired = link.expiresAt && Number(link.expiresAt) < Date.now();
    const isMaxedOut = link.maxUses && link.currentUses >= link.maxUses;

    return {
      isValid: link.isActive && !isExpired && !isMaxedOut,
      orgName: org.name,
      orgTag: org.tag,
      orgLogoUrl: org.logoUrl,
      defaultRole: link.defaultRole,
      expiresAt: link.expiresAt ? Number(link.expiresAt) : null,
    };
  },
});

/**
 * Direct invite by nickname search
 */
export const searchUsersForInvite = query({
  args: { 
    orgId: v.id("organizations"),
    query: v.string() 
  },
  handler: async (ctx, args) => {
    if (args.query.length < 2) return [];

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Get all users matching query
    const users = await ctx.db.query("users").collect();
    const matches = users.filter((u) => 
      u.nickname?.toLowerCase().includes(args.query.toLowerCase()) ||
      u.steamName?.toLowerCase().includes(args.query.toLowerCase()) ||
      (u as any).friendCode?.toLowerCase() === args.query.toLowerCase()
    ).slice(0, 10);

    // Get existing members to exclude
    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const memberIds = new Set(members.map((m) => m.userId.toString()));

    // Get pending invites to exclude
    const pendingInvites = await ctx.db
      .query("org_invites")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();
    
    const pendingIds = new Set(pendingInvites.map((i) => i.userId.toString()));

    return matches
      .filter((u) => !memberIds.has(u._id.toString()) && !pendingIds.has(u._id.toString()))
      .map((u) => ({
        _id: u._id,
        nickname: u.nickname,
        steamName: u.steamName,
        steamAvatar: u.steamAvatar,
        elo: u.elo_5v5,
        friendCode: (u as any).friendCode,
      }));
  },
});

/**
 * Send direct invite
 */
export const sendDirectInvite = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("PLAYER"),
      v.literal("STAND_IN"),
      v.literal("ANALYST"),
      v.literal("COACH")
    ),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!currentUser) throw new Error("User not found");

    // Check permission
    const member = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!member) throw new Error("Not a member");

    const permissions = ROLE_PERMISSIONS[member.role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions?.canInviteMembers) {
      throw new Error("No permission to invite members");
    }

    // Check target user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    // Check not already member
    const existingMember = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingMember) throw new Error("User is already a member");

    // Check no pending invite
    const pendingInvite = await ctx.db
      .query("org_invites")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("orgId"), args.orgId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .first();

    if (pendingInvite) throw new Error("Already has pending invite");

    const org = await ctx.db.get(args.orgId);

    // Create invite
    await ctx.db.insert("org_invites", {
      orgId: args.orgId,
      userId: args.userId,
      type: "INVITE",
      role: args.role as "PLAYER" | "COACH" | "ANALYST",
      message: args.message,
      status: "PENDING",
      createdAt: BigInt(Date.now()),
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: `Convite de ${org?.name}`,
      message: `Foste convidado para [${org?.tag}] como ${args.role}`,
      type: "SYSTEM",
      read: false,
      createdAt: BigInt(Date.now()),
    });

    console.log(`📨 [INVITE] ${currentUser.nickname} invited ${targetUser.nickname} to ${org?.tag}`);

    return { success: true };
  },
});

/**
 * Update member role
 */
export const updateMemberRole = mutation({
  args: {
    memberId: v.id("org_members"),
    newRole: v.union(
      v.literal("MANAGER"),
      v.literal("COACH"),
      v.literal("CAPTAIN"),
      v.literal("PLAYER"),
      v.literal("ANALYST"),
      v.literal("BENCH"),
      v.literal("STAND_IN")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!currentUser) throw new Error("User not found");

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) throw new Error("Member not found");

    // Check permission
    const myMember = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .filter((q) => q.eq(q.field("orgId"), targetMember.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!myMember) throw new Error("Not a member");

    const permissions = ROLE_PERMISSIONS[myMember.role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions?.canManageRoster) {
      throw new Error("No permission to manage roster");
    }

    // Can't change owner role
    if (targetMember.role === "OWNER") {
      throw new Error("Cannot change owner role");
    }

    // Can only change roles lower than yours
    const myLevel = ROLE_HIERARCHY[myMember.role as keyof typeof ROLE_HIERARCHY];
    const targetLevel = ROLE_HIERARCHY[targetMember.role as keyof typeof ROLE_HIERARCHY];
    const newLevel = ROLE_HIERARCHY[args.newRole as keyof typeof ROLE_HIERARCHY];

    if (targetLevel >= myLevel) {
      throw new Error("Cannot modify member with same or higher role");
    }
    if (newLevel >= myLevel) {
      throw new Error("Cannot promote to same or higher role than yours");
    }

    await ctx.db.patch(args.memberId, { role: args.newRole });

    console.log(`🔄 [ROLE] Changed ${targetMember.userId} to ${args.newRole}`);

    return { success: true };
  },
});

/**
 * Remove member from org
 */
export const removeMember = mutation({
  args: { memberId: v.id("org_members") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!currentUser) throw new Error("User not found");

    const targetMember = await ctx.db.get(args.memberId);
    if (!targetMember) throw new Error("Member not found");

    // Check permission
    const myMember = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .filter((q) => q.eq(q.field("orgId"), targetMember.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!myMember) throw new Error("Not a member");

    const permissions = ROLE_PERMISSIONS[myMember.role as keyof typeof ROLE_PERMISSIONS];
    if (!permissions?.canManageRoster) {
      throw new Error("No permission to manage roster");
    }

    // Can't remove owner
    if (targetMember.role === "OWNER") {
      throw new Error("Cannot remove owner");
    }

    // Can only remove roles lower than yours
    const myLevel = ROLE_HIERARCHY[myMember.role as keyof typeof ROLE_HIERARCHY];
    const targetLevel = ROLE_HIERARCHY[targetMember.role as keyof typeof ROLE_HIERARCHY];

    if (targetLevel >= myLevel) {
      throw new Error("Cannot remove member with same or higher role");
    }

    await ctx.db.patch(args.memberId, { 
      isActive: false, 
      leftAt: BigInt(Date.now()) 
    });

    console.log(`❌ [ROSTER] Removed member ${targetMember.userId}`);

    return { success: true };
  },
});
