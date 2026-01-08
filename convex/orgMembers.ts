/**
 * FASE 56: ORG MEMBERS QUERIES
 * Separate file for member management queries
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all members of an organization with user details
 */
export const getOrgMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("org_members")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Fetch user details for each member
    const membersWithUsers = await Promise.all(
      members.map(async (member) => {
        const user = await ctx.db.get(member.userId);
        return {
          ...member,
          user,
        };
      })
    );

    // Sort by role hierarchy (owner first, then managers, etc.)
    const roleOrder: Record<string, number> = {
      OWNER: 0,
      MANAGER: 1,
      COACH: 2,
      CAPTAIN: 3,
      PLAYER: 4,
      ANALYST: 5,
      BENCH: 6,
      STAND_IN: 7,
    };
    
    return membersWithUsers.sort((a, b) => {
      return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
    });
  },
});
