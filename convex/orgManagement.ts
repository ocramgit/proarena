import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 55: ORG MANAGEMENT SUITE
 * Divisions, Calendar, Stratbook access
 */

// Check if user can manage org (owner or manager)
async function canManageOrg(ctx: any, orgId: Id<"organizations">): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) return false;

  const org = await ctx.db.get(orgId);
  if (!org) return false;

  return org.ownerId === user._id || org.managersIds?.includes(user._id);
}

// Check if user is member of org
async function isOrgMember(ctx: any, orgId: Id<"organizations">): Promise<{
  isMember: boolean;
  member: any;
  user: any;
}> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { isMember: false, member: null, user: null };

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .first();
  if (!user) return { isMember: false, member: null, user: null };

  const member = await ctx.db
    .query("org_members")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .filter((q: any) => q.eq(q.field("orgId"), orgId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .first();

  return { isMember: !!member, member, user };
}

// ============================================
// DIVISIONS
// ============================================

/**
 * Get org divisions
 */
export const getDivisions = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { isMember } = await isOrgMember(ctx, args.orgId);
    if (!isMember) return [];

    const divisions = await ctx.db
      .query("org_divisions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get member counts for each division
    return await Promise.all(divisions.map(async (div) => {
      const memberDivisions = await ctx.db
        .query("org_member_divisions")
        .withIndex("by_division", (q) => q.eq("divisionId", div._id))
        .collect();

      return {
        ...div,
        memberCount: memberDivisions.length,
        createdAt: Number(div.createdAt),
      };
    }));
  },
});

/**
 * Create division
 */
export const createDivision = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    type: v.union(
      v.literal("MAIN"),
      v.literal("ACADEMY"),
      v.literal("STREAMERS"),
      v.literal("CONTENT"),
      v.literal("STAFF"),
      v.literal("CUSTOM")
    ),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    canAccessStratbook: v.boolean(),
    canAccessMainCalendar: v.boolean(),
  },
  handler: async (ctx, args) => {
    const canManage = await canManageOrg(ctx, args.orgId);
    if (!canManage) throw new Error("Acesso negado");

    // Get max display order
    const divisions = await ctx.db
      .query("org_divisions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    const maxOrder = Math.max(0, ...divisions.map((d) => d.displayOrder));

    const divisionId = await ctx.db.insert("org_divisions", {
      orgId: args.orgId,
      name: args.name,
      type: args.type,
      description: args.description,
      color: args.color,
      displayOrder: maxOrder + 1,
      canAccessStratbook: args.canAccessStratbook,
      canAccessMainCalendar: args.canAccessMainCalendar,
      createdAt: BigInt(Date.now()),
    });

    return divisionId;
  },
});

/**
 * Update division
 */
export const updateDivision = mutation({
  args: {
    divisionId: v.id("org_divisions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    canAccessStratbook: v.optional(v.boolean()),
    canAccessMainCalendar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const division = await ctx.db.get(args.divisionId);
    if (!division) throw new Error("Division not found");

    const canManage = await canManageOrg(ctx, division.orgId);
    if (!canManage) throw new Error("Acesso negado");

    await ctx.db.patch(args.divisionId, {
      ...(args.name && { name: args.name }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.color !== undefined && { color: args.color }),
      ...(args.canAccessStratbook !== undefined && { canAccessStratbook: args.canAccessStratbook }),
      ...(args.canAccessMainCalendar !== undefined && { canAccessMainCalendar: args.canAccessMainCalendar }),
      updatedAt: BigInt(Date.now()),
    });
  },
});

/**
 * Delete division
 */
export const deleteDivision = mutation({
  args: { divisionId: v.id("org_divisions") },
  handler: async (ctx, args) => {
    const division = await ctx.db.get(args.divisionId);
    if (!division) throw new Error("Division not found");

    const canManage = await canManageOrg(ctx, division.orgId);
    if (!canManage) throw new Error("Acesso negado");

    // Remove all member assignments
    const assignments = await ctx.db
      .query("org_member_divisions")
      .withIndex("by_division", (q) => q.eq("divisionId", args.divisionId))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    await ctx.db.delete(args.divisionId);
  },
});

/**
 * Assign member to division
 */
export const assignMemberToDivision = mutation({
  args: {
    orgId: v.id("organizations"),
    memberId: v.id("org_members"),
    divisionId: v.id("org_divisions"),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const canManage = await canManageOrg(ctx, args.orgId);
    if (!canManage) throw new Error("Acesso negado");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Check if already assigned
    const existing = await ctx.db
      .query("org_member_divisions")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("divisionId"), args.divisionId))
      .first();

    if (existing) {
      // Update isPrimary if needed
      if (args.isPrimary !== undefined) {
        await ctx.db.patch(existing._id, { isPrimary: args.isPrimary });
      }
      return existing._id;
    }

    // If setting as primary, remove primary from other divisions
    if (args.isPrimary) {
      const otherAssignments = await ctx.db
        .query("org_member_divisions")
        .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
        .filter((q) => q.eq(q.field("isPrimary"), true))
        .collect();

      for (const assignment of otherAssignments) {
        await ctx.db.patch(assignment._id, { isPrimary: false });
      }
    }

    return await ctx.db.insert("org_member_divisions", {
      orgId: args.orgId,
      memberId: args.memberId,
      divisionId: args.divisionId,
      isPrimary: args.isPrimary || false,
      assignedAt: BigInt(Date.now()),
      assignedBy: user._id,
    });
  },
});

/**
 * Remove member from division
 */
export const removeMemberFromDivision = mutation({
  args: {
    memberId: v.id("org_members"),
    divisionId: v.id("org_divisions"),
  },
  handler: async (ctx, args) => {
    const division = await ctx.db.get(args.divisionId);
    if (!division) throw new Error("Division not found");

    const canManage = await canManageOrg(ctx, division.orgId);
    if (!canManage) throw new Error("Acesso negado");

    const assignment = await ctx.db
      .query("org_member_divisions")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .filter((q) => q.eq(q.field("divisionId"), args.divisionId))
      .first();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});

/**
 * Get roster by division (for drag & drop UI)
 */
export const getRosterByDivision = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { isMember } = await isOrgMember(ctx, args.orgId);
    if (!isMember) return null;

    // Get all divisions
    const divisions = await ctx.db
      .query("org_divisions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Get all members
    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org_active", (q) => q.eq("orgId", args.orgId).eq("isActive", true))
      .collect();

    // Get all member-division assignments
    const assignments = await ctx.db
      .query("org_member_divisions")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Build roster structure
    const roster: Record<string, any[]> = {
      unassigned: [],
    };

    for (const div of divisions) {
      roster[div._id] = [];
    }

    // Process members
    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      const memberData = {
        _id: member._id,
        userId: member.userId,
        role: member.role,
        gameRole: member.gameRole,
        user: user ? {
          nickname: user.nickname,
          steamName: user.steamName,
          steamAvatar: user.steamAvatar,
        } : null,
      };

      // Find assignments for this member
      const memberAssignments = assignments.filter((a) => a.memberId === member._id);

      if (memberAssignments.length === 0) {
        roster.unassigned.push(memberData);
      } else {
        for (const assignment of memberAssignments) {
          if (roster[assignment.divisionId]) {
            roster[assignment.divisionId].push({
              ...memberData,
              isPrimary: assignment.isPrimary,
            });
          }
        }
      }
    }

    return {
      divisions: divisions.map((d) => ({
        _id: d._id,
        name: d.name,
        type: d.type,
        color: d.color,
        displayOrder: d.displayOrder,
      })),
      roster,
    };
  },
});

// ============================================
// CALENDAR
// ============================================

/**
 * Get calendar events for org
 */
export const getCalendarEvents = query({
  args: {
    orgId: v.id("organizations"),
    startDate: v.int64(),
    endDate: v.int64(),
  },
  handler: async (ctx, args) => {
    const { isMember, member } = await isOrgMember(ctx, args.orgId);
    if (!isMember) return [];

    // Get member's divisions for permission checking
    const memberDivisions = member
      ? await ctx.db
          .query("org_member_divisions")
          .withIndex("by_member", (q) => q.eq("memberId", member._id))
          .collect()
      : [];

    const divisionIds = memberDivisions.map((md) => md.divisionId);

    // Get events in date range
    const events = await ctx.db
      .query("org_calendar_events")
      .withIndex("by_org_date", (q) => 
        q.eq("orgId", args.orgId).gte("startTime", args.startDate)
      )
      .filter((q) => q.lte(q.field("startTime"), args.endDate))
      .collect();

    // Filter by division access
    const accessibleEvents = events.filter((event) => {
      if (!event.divisionId) return true; // Org-wide event
      return divisionIds.includes(event.divisionId);
    });

    return accessibleEvents.map((e) => ({
      _id: e._id,
      title: e.title,
      description: e.description,
      eventType: e.eventType,
      startTime: Number(e.startTime),
      endTime: e.endTime ? Number(e.endTime) : null,
      isAllDay: e.isAllDay,
      status: e.status,
      divisionId: e.divisionId,
    }));
  },
});

/**
 * Create calendar event
 */
export const createCalendarEvent = mutation({
  args: {
    orgId: v.id("organizations"),
    divisionId: v.optional(v.id("org_divisions")),
    title: v.string(),
    description: v.optional(v.string()),
    eventType: v.union(
      v.literal("PRACC"),
      v.literal("TOURNAMENT"),
      v.literal("SCRIM"),
      v.literal("TRAINING"),
      v.literal("VOD_REVIEW"),
      v.literal("MEETING"),
      v.literal("MEDIA"),
      v.literal("DAY_OFF"),
      v.literal("OTHER")
    ),
    startTime: v.int64(),
    endTime: v.optional(v.int64()),
    isAllDay: v.optional(v.boolean()),
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("CONFIRMED"),
      v.literal("CANCELLED"),
      v.literal("COMPLETED")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check if captain, coach, or manager
    const { isMember, member, user } = await isOrgMember(ctx, args.orgId);
    if (!isMember || !member || !user) throw new Error("Not a member");

    const canCreate = ["OWNER", "MANAGER", "CAPTAIN", "COACH"].includes(member.role);
    if (!canCreate) throw new Error("Apenas Captain, Coach ou Manager podem criar eventos");

    return await ctx.db.insert("org_calendar_events", {
      orgId: args.orgId,
      divisionId: args.divisionId,
      title: args.title,
      description: args.description,
      eventType: args.eventType,
      startTime: args.startTime,
      endTime: args.endTime,
      isAllDay: args.isAllDay,
      status: args.status || "PENDING",
      createdBy: user._id,
      createdAt: BigInt(Date.now()),
    });
  },
});

/**
 * Update calendar event
 */
export const updateCalendarEvent = mutation({
  args: {
    eventId: v.id("org_calendar_events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.int64()),
    endTime: v.optional(v.int64()),
    status: v.optional(v.union(
      v.literal("PENDING"),
      v.literal("CONFIRMED"),
      v.literal("CANCELLED"),
      v.literal("COMPLETED")
    )),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const { isMember, member } = await isOrgMember(ctx, event.orgId);
    if (!isMember || !member) throw new Error("Not a member");

    const canEdit = ["OWNER", "MANAGER", "CAPTAIN", "COACH"].includes(member.role);
    if (!canEdit) throw new Error("Sem permissão para editar eventos");

    await ctx.db.patch(args.eventId, {
      ...(args.title && { title: args.title }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.startTime && { startTime: args.startTime }),
      ...(args.endTime !== undefined && { endTime: args.endTime }),
      ...(args.status && { status: args.status }),
      updatedAt: BigInt(Date.now()),
    });
  },
});

/**
 * Delete calendar event
 */
export const deleteCalendarEvent = mutation({
  args: { eventId: v.id("org_calendar_events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const { isMember, member } = await isOrgMember(ctx, event.orgId);
    if (!isMember || !member) throw new Error("Not a member");

    const canDelete = ["OWNER", "MANAGER", "CAPTAIN", "COACH"].includes(member.role);
    if (!canDelete) throw new Error("Sem permissão para eliminar eventos");

    await ctx.db.delete(args.eventId);
  },
});

// ============================================
// SPONSORS
// ============================================

/**
 * Get org sponsors
 */
export const getSponsors = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const sponsors = await ctx.db
      .query("org_sponsors")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return sponsors.sort((a, b) => a.displayOrder - b.displayOrder);
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

    const sponsors = await ctx.db
      .query("org_sponsors")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return await ctx.db.insert("org_sponsors", {
      orgId: args.orgId,
      name: args.name,
      logoUrl: args.logoUrl,
      websiteUrl: args.websiteUrl,
      tier: args.tier,
      displayOrder: sponsors.length,
      createdAt: BigInt(Date.now()),
    });
  },
});

/**
 * Update sponsor
 */
export const updateSponsor = mutation({
  args: {
    sponsorId: v.id("org_sponsors"),
    name: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    tier: v.optional(v.union(v.literal("MAIN"), v.literal("PARTNER"), v.literal("SUPPORTER"))),
    displayOrder: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const sponsor = await ctx.db.get(args.sponsorId);
    if (!sponsor) throw new Error("Sponsor not found");

    const canManage = await canManageOrg(ctx, sponsor.orgId);
    if (!canManage) throw new Error("Acesso negado");

    await ctx.db.patch(args.sponsorId, {
      ...(args.name && { name: args.name }),
      ...(args.logoUrl !== undefined && { logoUrl: args.logoUrl }),
      ...(args.websiteUrl !== undefined && { websiteUrl: args.websiteUrl }),
      ...(args.tier && { tier: args.tier }),
      ...(args.displayOrder !== undefined && { displayOrder: args.displayOrder }),
    });
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
  },
});
