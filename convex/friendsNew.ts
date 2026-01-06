import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * FASE 38: FRIENDS SYSTEM (New Implementation)
 * Using 'friends' table with user1Id, user2Id, actionUserId
 */

/**
 * Send friend request
 */
export const sendFriendRequest = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");
    if (currentUser._id === args.targetUserId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if friendship already exists (either direction)
    const existing1 = await ctx.db
      .query("friends")
      .withIndex("by_users", (q) =>
        q.eq("user1Id", currentUser._id).eq("user2Id", args.targetUserId)
      )
      .first();

    const existing2 = await ctx.db
      .query("friends")
      .withIndex("by_users", (q) =>
        q.eq("user1Id", args.targetUserId).eq("user2Id", currentUser._id)
      )
      .first();

    if (existing1 || existing2) {
      throw new Error("Friend request already exists");
    }

    await ctx.db.insert("friends", {
      user1Id: currentUser._id,
      user2Id: args.targetUserId,
      status: "PENDING",
      actionUserId: currentUser._id, // Current user sent the request
      createdAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Accept friend request
 */
export const acceptFriendRequest = mutation({
  args: {
    friendshipId: v.id("friends"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error("Friendship not found");

    // Only the receiver can accept
    if (friendship.user2Id !== currentUser._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.friendshipId, {
      status: "ACCEPTED",
    });

    return { success: true };
  },
});

/**
 * Reject/Remove friendship
 */
export const removeFriendship = mutation({
  args: {
    friendshipId: v.id("friends"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throw new Error("Friendship not found");

    // Only participants can remove
    if (
      friendship.user1Id !== currentUser._id &&
      friendship.user2Id !== currentUser._id
    ) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.friendshipId);
    return { success: true };
  },
});

/**
 * Get friends list with status
 */
export const getFriends = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    // Get friendships where user is user1Id
    const friendships1 = await ctx.db
      .query("friends")
      .withIndex("by_user1", (q) => q.eq("user1Id", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    // Get friendships where user is user2Id
    const friendships2 = await ctx.db
      .query("friends")
      .withIndex("by_user2", (q) => q.eq("user2Id", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    const allFriendships = [...friendships1, ...friendships2];

    // Get friend user objects
    const friends = await Promise.all(
      allFriendships.map(async (friendship) => {
        const friendId =
          friendship.user1Id === currentUser._id
            ? friendship.user2Id
            : friendship.user1Id;
        const friend = await ctx.db.get(friendId);
        
        if (!friend) return null;

        return {
          friendshipId: friendship._id,
          userId: friend._id,
          nickname: friend.nickname,
          steamName: friend.steamName,
          steamAvatar: friend.steamAvatar,
          elo_1v1: friend.elo_1v1,
        };
      })
    );

    return friends.filter((f) => f !== null);
  },
});

/**
 * Get pending friend requests (received)
 */
export const getPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    // Get pending requests where current user is user2Id (receiver)
    const pendingRequests = await ctx.db
      .query("friends")
      .withIndex("by_user2", (q) => q.eq("user2Id", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    // Get sender user objects
    const requests = await Promise.all(
      pendingRequests.map(async (request) => {
        const sender = await ctx.db.get(request.user1Id);
        
        if (!sender) return null;

        return {
          friendshipId: request._id,
          userId: sender._id,
          nickname: sender.nickname,
          steamName: sender.steamName,
          steamAvatar: sender.steamAvatar,
          createdAt: request.createdAt,
        };
      })
    );

    return requests.filter((r) => r !== null);
  },
});

/**
 * Check friendship status with a specific user
 */
export const getFriendshipStatus = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return null;

    // Check both directions
    const friendship1 = await ctx.db
      .query("friends")
      .withIndex("by_users", (q) =>
        q.eq("user1Id", currentUser._id).eq("user2Id", args.targetUserId)
      )
      .first();

    const friendship2 = await ctx.db
      .query("friends")
      .withIndex("by_users", (q) =>
        q.eq("user1Id", args.targetUserId).eq("user2Id", currentUser._id)
      )
      .first();

    const friendship = friendship1 || friendship2;

    if (!friendship) {
      return { status: "NONE", friendshipId: null };
    }

    return {
      status: friendship.status,
      friendshipId: friendship._id,
      isSender: friendship.actionUserId === currentUser._id,
    };
  },
});
