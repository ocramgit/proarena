import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * FASE 38: DIRECT MESSAGES SYSTEM
 * Real-time chat between friends
 */

/**
 * Send a direct message
 */
export const sendMessage = mutation({
  args: {
    receiverId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Message cannot be empty");
    }

    if (args.content.length > 500) {
      throw new Error("Message too long (max 500 characters)");
    }

    await ctx.db.insert("direct_messages", {
      senderId: currentUser._id,
      receiverId: args.receiverId,
      content: args.content.trim(),
      read: false,
      timestamp: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Get conversation with a specific user
 */
export const getConversation = query({
  args: {
    otherUserId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    const limit = args.limit || 50;

    // Get all messages between the two users
    const allMessages = await ctx.db.query("direct_messages").collect();

    const conversationMessages = allMessages
      .filter(
        (msg) =>
          (msg.senderId === currentUser._id &&
            msg.receiverId === args.otherUserId) ||
          (msg.senderId === args.otherUserId &&
            msg.receiverId === currentUser._id)
      )
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
      .slice(-limit);

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      conversationMessages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          _id: msg._id,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          content: msg.content,
          read: msg.read,
          timestamp: msg.timestamp,
          senderNickname: sender?.nickname,
          senderAvatar: sender?.steamAvatar,
        };
      })
    );

    return messagesWithSender;
  },
});

/**
 * Mark messages as read
 */
export const markAsRead = mutation({
  args: {
    senderId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) throw new Error("User not found");

    // Get all unread messages from the sender to current user
    const unreadMessages = await ctx.db
      .query("direct_messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", currentUser._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), args.senderId),
          q.eq(q.field("read"), false)
        )
      )
      .collect();

    // Mark them as read
    await Promise.all(
      unreadMessages.map((msg) =>
        ctx.db.patch(msg._id, { read: true })
      )
    );

    return { success: true, markedCount: unreadMessages.length };
  },
});

/**
 * Get unread message count per conversation
 */
export const getUnreadCounts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    // Get all unread messages received by current user
    const unreadMessages = await ctx.db
      .query("direct_messages")
      .withIndex("by_receiver", (q) => q.eq("receiverId", currentUser._id))
      .filter((q) => q.eq(q.field("read"), false))
      .collect();

    // Group by sender
    const countsBySender: Record<string, number> = {};
    unreadMessages.forEach((msg) => {
      const senderId = msg.senderId;
      countsBySender[senderId] = (countsBySender[senderId] || 0) + 1;
    });

    return Object.entries(countsBySender).map(([senderId, count]) => ({
      userId: senderId as any,
      unreadCount: count,
    }));
  },
});

/**
 * Get recent conversations (users you've chatted with)
 */
export const getRecentConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) return [];

    // Get all messages involving current user
    const allMessages = await ctx.db.query("direct_messages").collect();

    const userMessages = allMessages.filter(
      (msg) =>
        msg.senderId === currentUser._id || msg.receiverId === currentUser._id
    );

    // Get unique user IDs and their last message timestamp
    const conversationMap = new Map<string, number>();

    userMessages.forEach((msg) => {
      const otherUserId =
        msg.senderId === currentUser._id ? msg.receiverId : msg.senderId;
      const existingTimestamp = conversationMap.get(otherUserId) || 0;
      if (Number(msg.timestamp) > existingTimestamp) {
        conversationMap.set(otherUserId, Number(msg.timestamp));
      }
    });

    // Convert to array and sort by last message time
    const conversations = Array.from(conversationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Limit to 10 recent conversations

    // Get user info
    const conversationsWithUser = await Promise.all(
      conversations.map(async ([userId, lastMessageTime]) => {
        const user = await ctx.db.get(userId as any);
        if (!user || user._id.toString().startsWith("staff_members")) return null;

        return {
          userId: user._id,
          nickname: (user as any).nickname,
          steamName: (user as any).steamName,
          steamAvatar: (user as any).steamAvatar,
          lastMessageTime,
        };
      })
    );

    return conversationsWithUser.filter((c) => c !== null);
  },
});
