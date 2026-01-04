import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send friend request
export const sendFriendRequest = mutation({
  args: {
    targetUserId: v.id("users"),
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

    if (currentUser._id === args.targetUserId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if friendship already exists
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => 
        q.eq("user1", currentUser._id).eq("user2", args.targetUserId)
      )
      .first();

    const existingFriendshipReverse = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => 
        q.eq("user1", args.targetUserId).eq("user2", currentUser._id)
      )
      .first();

    if (existingFriendship || existingFriendshipReverse) {
      throw new Error("Friendship already exists");
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

// Accept friend request
export const acceptFriendRequest = mutation({
  args: {
    friendshipId: v.id("friendships"),
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

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friendship not found");
    }

    if (friendship.user2 !== currentUser._id) {
      throw new Error("Not authorized to accept this request");
    }

    await ctx.db.patch(args.friendshipId, {
      status: "ACCEPTED",
    });

    return { success: true };
  },
});

// Get my friends
export const getMyFriends = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      return [];
    }

    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_user1", (q) => q.eq("user1", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "ACCEPTED"))
      .collect();

    const friendIds = [
      ...friendships1.map((f) => f.user2),
      ...friendships2.map((f) => f.user1),
    ];

    const friends = await Promise.all(
      friendIds.map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        // Check if user is in active match
        const activeMatch = await ctx.db
          .query("matches")
          .filter((q) =>
            q.or(
              q.eq(q.field("state"), "VETO"),
              q.eq(q.field("state"), "CONFIGURING"),
              q.eq(q.field("state"), "WARMUP"),
              q.eq(q.field("state"), "LIVE")
            )
          )
          .collect();

        const isInGame = activeMatch.some(
          (match) =>
            match.teamA.includes(id) || match.teamB.includes(id)
        );

        return {
          ...user,
          displayName: user.clerkId.startsWith("fake_")
            ? user.clerkId.replace("fake_", "Bot").substring(0, 15)
            : user.clerkId.substring(0, 10),
          status: isInGame ? "IN_GAME" : "ONLINE",
        };
      })
    );

    return friends.filter((f) => f !== null);
  },
});

// Get friend requests (pending)
export const getFriendRequests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      return [];
    }

    const requests = await ctx.db
      .query("friendships")
      .withIndex("by_user2", (q) => q.eq("user2", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        const sender = await ctx.db.get(req.user1);
        return {
          ...req,
          sender: sender
            ? {
                ...sender,
                displayName: sender.clerkId.startsWith("fake_")
                  ? sender.clerkId.replace("fake_", "Bot").substring(0, 15)
                  : sender.clerkId.substring(0, 10),
              }
            : null,
        };
      })
    );

    return enrichedRequests.filter((r) => r.sender !== null);
  },
});

// Send message
export const sendMessage = mutation({
  args: {
    channelId: v.string(),
    content: v.string(),
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

    if (args.content.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (args.content.length > 500) {
      throw new Error("Message too long (max 500 characters)");
    }

    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: currentUser._id,
      content: args.content.trim(),
      createdAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

// Get messages for a channel
export const getMessages = query({
  args: {
    channelId: v.string(),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(args.limit || 50);

    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const author = await ctx.db.get(msg.authorId);
        return {
          ...msg,
          author: author
            ? {
                ...author,
                displayName: author.clerkId.startsWith("fake_")
                  ? author.clerkId.replace("fake_", "Bot").substring(0, 15)
                  : author.clerkId.substring(0, 10),
              }
            : null,
        };
      })
    );

    return enrichedMessages.filter((m) => m.author !== null).reverse();
  },
});
