import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * PRIORIDADE MÉDIA: SISTEMA DE AMIZADES
 * Gestão de pedidos de amizade e lista de amigos
 */

/**
 * Enviar pedido de amizade
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

    // Check if friendship already exists
    const existing = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("user1", currentUser._id).eq("user2", args.targetUserId)
      )
      .first();

    if (existing) {
      throw new Error("Friend request already sent");
    }

    // Check reverse
    const existingReverse = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) =>
        q.eq("user1", args.targetUserId).eq("user2", currentUser._id)
      )
      .first();

    if (existingReverse) {
      throw new Error("Friend request already exists");
    }

    await ctx.db.insert("friendships", {
      user1: currentUser._id,
      user2: args.targetUserId,
      status: "PENDING",
      createdAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Aceitar pedido de amizade
 */
export const acceptFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
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

    // Only user2 can accept
    if (friendship.user2 !== currentUser._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.friendshipId, {
      status: "ACCEPTED",
    });

    return { success: true };
  },
});

/**
 * Rejeitar/Remover amizade
 */
export const removeFriendship = mutation({
  args: {
    friendshipId: v.id("friendships"),
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
      friendship.user1 !== currentUser._id &&
      friendship.user2 !== currentUser._id
    ) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.friendshipId);
    return { success: true };
  },
});

/**
 * Obter lista de amigos
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

    // Get friendships where user is user1
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    // Get friendships where user is user2
    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    const allFriendships = [...friendships1, ...friendships2];

    // Get friend user objects
    const friends = await Promise.all(
      allFriendships.map(async (friendship) => {
        const friendId =
          friendship.user1 === currentUser._id
            ? friendship.user2
            : friendship.user1;
        const friend = await ctx.db.get(friendId);
        return {
          friendshipId: friendship._id,
          user: friend,
        };
      })
    );

    return friends.filter((f) => f.user !== null);
  },
});

/**
 * Obter pedidos de amizade pendentes
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

    // Get pending requests where current user is user2 (receiver)
    const pendingRequests = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    // Get sender user objects
    const requests = await Promise.all(
      pendingRequests.map(async (request) => {
        const sender = await ctx.db.get(request.user1);
        return {
          friendshipId: request._id,
          sender,
          createdAt: request.createdAt,
        };
      })
    );

    return requests.filter((r) => r.sender !== null);
  },
});

/**
 * Pesquisar users para adicionar como amigos
 */
export const searchUsers = query({
  args: {
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    // Search by steamName
    const users = await ctx.db.query("users").collect();
    
    const filtered = users
      .filter((u) => {
        if (u._id === currentUser._id) return false; // Exclude self
        const steamName = u.steamName?.toLowerCase() || "";
        const searchLower = args.search.toLowerCase();
        return steamName.includes(searchLower);
      })
      .slice(0, 10); // Limit to 10 results

    return filtered;
  },
});
