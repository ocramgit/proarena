import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create party
export const createParty = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is already in a party
    const existingParty = await ctx.db
      .query("parties")
      .filter((q) => 
        q.or(
          q.eq(q.field("leaderId"), currentUser._id),
          q.eq(q.field("members"), [currentUser._id])
        )
      )
      .first();

    if (existingParty) {
      throw new Error("Already in a party");
    }

    const partyId = await ctx.db.insert("parties", {
      leaderId: currentUser._id,
      members: [currentUser._id],
      createdAt: BigInt(Date.now()),
    });

    return { success: true, partyId };
  },
});

// Invite to party
export const inviteToParty = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Get current user's party
    const party = await ctx.db
      .query("parties")
      .withIndex("by_leader", (q) => q.eq("leaderId", currentUser._id))
      .first();

    if (!party) {
      throw new Error("You are not a party leader");
    }

    // Check if user is already in party
    if (party.members.includes(args.userId)) {
      throw new Error("User already in party");
    }

    // Check if user is in another party
    const targetUserParty = await ctx.db
      .query("parties")
      .filter((q) => q.eq(q.field("members"), [args.userId]))
      .first();

    if (targetUserParty) {
      throw new Error("User is already in another party");
    }

    // Add user to party
    await ctx.db.patch(party._id, {
      members: [...party.members, args.userId],
    });

    return { success: true };
  },
});

// Leave party
export const leaveParty = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Find party
    const parties = await ctx.db.query("parties").collect();
    const party = parties.find((p) => p.members.includes(currentUser._id));

    if (!party) {
      throw new Error("Not in a party");
    }

    // If leader, disband party
    if (party.leaderId === currentUser._id) {
      await ctx.db.delete(party._id);
      return { success: true, disbanded: true };
    }

    // Remove member
    await ctx.db.patch(party._id, {
      members: party.members.filter((id) => id !== currentUser._id),
    });

    return { success: true, disbanded: false };
  },
});

// Get my party
export const getMyParty = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      return null;
    }

    const parties = await ctx.db.query("parties").collect();
    const party = parties.find((p) => p.members.includes(currentUser._id));

    if (!party) {
      return null;
    }

    const members = await Promise.all(
      party.members.map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        return {
          ...user,
          displayName: user.clerkId.startsWith("fake_")
            ? user.clerkId.replace("fake_", "Bot").substring(0, 15)
            : user.clerkId.substring(0, 10),
          isLeader: id === party.leaderId,
        };
      })
    );

    return {
      ...party,
      members: members.filter((m) => m !== null),
    };
  },
});

// Kick from party (leader only)
export const kickFromParty = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    const party = await ctx.db
      .query("parties")
      .withIndex("by_leader", (q) => q.eq("leaderId", currentUser._id))
      .first();

    if (!party) {
      throw new Error("You are not a party leader");
    }

    if (!party.members.includes(args.userId)) {
      throw new Error("User not in party");
    }

    if (args.userId === party.leaderId) {
      throw new Error("Cannot kick the leader");
    }

    await ctx.db.patch(party._id, {
      members: party.members.filter((id) => id !== args.userId),
    });

    return { success: true };
  },
});
