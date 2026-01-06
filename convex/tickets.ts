import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * FASE 32: SUPPORT SYSTEM - TICKETS & LIVE ASSIST
 * Sistema profissional de atendimento ao cliente
 */

/**
 * Create a new support ticket
 */
export const createTicket = mutation({
  args: {
    category: v.union(
      v.literal("BILLING"),
      v.literal("BUG"),
      v.literal("REPORT"),
      v.literal("OTHER")
    ),
    subject: v.string(),
    initialMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Determine priority based on category
    let priority: "LOW" | "HIGH" | "URGENT" = "LOW";
    if (args.category === "BILLING") priority = "HIGH";
    if (args.category === "REPORT") priority = "URGENT";

    const now = BigInt(Date.now());

    // Create ticket
    const ticketId = await ctx.db.insert("tickets", {
      userId: user._id,
      category: args.category,
      subject: args.subject,
      status: "OPEN",
      priority,
      createdAt: now,
      updatedAt: now,
    });

    // Add initial message
    await ctx.db.insert("ticket_messages", {
      ticketId,
      senderId: user._id,
      content: args.initialMessage,
      isAdminReply: false,
      createdAt: now,
    });

    // Create notification for admins
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "ADMIN"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "Novo Ticket de Suporte",
        message: `${user.steamName || "Utilizador"} criou um ticket: ${args.subject}`,
        link: `/admin/tickets/${ticketId}`,
        type: "SYSTEM",
        read: false,
        createdAt: BigInt(Date.now()),
      });
    }

    return ticketId;
  },
});

/**
 * Get user's tickets
 */
export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return tickets;
  },
});

/**
 * Get ticket by ID with messages
 */
export const getTicket = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return null;

    const messages = await ctx.db
      .query("ticket_messages")
      .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
      .order("asc")
      .collect();

    // Get sender info for each message
    const messagesWithSender = await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          senderName: sender?.steamName || "Unknown",
          senderRole: sender?.role || "USER",
        };
      })
    );

    const user = await ctx.db.get(ticket.userId);

    return {
      ...ticket,
      userName: user?.steamName || "Unknown",
      userEmail: user?.clerkId || "",
      messages: messagesWithSender,
    };
  },
});

/**
 * Send message to ticket
 */
export const sendTicketMessage = mutation({
  args: {
    ticketId: v.id("tickets"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const isAdmin = user.role === "ADMIN";

    // Add message
    const messageId = await ctx.db.insert("ticket_messages", {
      ticketId: args.ticketId,
      senderId: user._id,
      content: args.content,
      isAdminReply: isAdmin,
      createdAt: BigInt(Date.now()),
    });

    // Update ticket status and timestamp
    await ctx.db.patch(args.ticketId, {
      status: isAdmin ? "IN_PROGRESS" : ticket.status,
      updatedAt: BigInt(Date.now()),
    });

    // Notify the other party
    if (isAdmin) {
      // Notify ticket owner
      await ctx.db.insert("notifications", {
        userId: ticket.userId,
        title: "Nova Resposta no Ticket",
        message: `Um admin respondeu ao teu ticket: ${ticket.subject}`,
        link: `/support/${args.ticketId}`,
        type: "SYSTEM",
        read: false,
        createdAt: BigInt(Date.now()),
      });
    } else {
      // Notify admins
      const admins = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "ADMIN"))
        .collect();

      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          title: "Nova Mensagem no Ticket",
          message: `${user.steamName} respondeu no ticket: ${ticket.subject}`,
          link: `/admin/tickets/${args.ticketId}`,
          type: "SYSTEM",
          read: false,
          createdAt: BigInt(Date.now()),
        });
      }
    }

    return messageId;
  },
});

/**
 * Close ticket (Admin only)
 */
export const closeTicket = mutation({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    await ctx.db.patch(args.ticketId, {
      status: "CLOSED",
      closedAt: BigInt(Date.now()),
      closedBy: user._id,
      updatedAt: BigInt(Date.now()),
    });

    // Notify ticket owner
    await ctx.db.insert("notifications", {
      userId: ticket.userId,
      title: "Ticket Fechado",
      message: `O teu ticket "${ticket.subject}" foi resolvido e fechado.`,
      link: `/support/${args.ticketId}`,
      type: "SYSTEM",
      read: false,
      createdAt: BigInt(Date.now()),
    });

    return true;
  },
});

/**
 * Get all tickets for admin panel
 */
export const getAllTickets = query({
  args: {
    status: v.optional(v.union(
      v.literal("OPEN"),
      v.literal("IN_PROGRESS"),
      v.literal("CLOSED")
    )),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") return [];

    const tickets = args.status
      ? await ctx.db
          .query("tickets")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("tickets").order("desc").collect();

    // Get user info for each ticket
    const ticketsWithUser = await Promise.all(
      tickets.map(async (ticket) => {
        const ticketUser = await ctx.db.get(ticket.userId);
        const messageCount = await ctx.db
          .query("ticket_messages")
          .withIndex("by_ticket", (q) => q.eq("ticketId", ticket._id))
          .collect();

        return {
          ...ticket,
          userName: ticketUser?.steamName || "Unknown",
          messageCount: messageCount.length,
        };
      })
    );

    return ticketsWithUser;
  },
});

/**
 * LOBBY SOS - Call Admin
 */
export const callAdmin = mutation({
  args: {
    matchId: v.id("matches"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    // Check if already called admin for this match
    const existing = await ctx.db
      .query("lobby_alerts")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .first();

    if (existing) {
      throw new Error("Admin já foi chamado para esta partida");
    }

    // Create alert
    const alertId = await ctx.db.insert("lobby_alerts", {
      matchId: args.matchId,
      userId: user._id,
      reason: args.reason,
      status: "PENDING",
      createdAt: BigInt(Date.now()),
    });

    // Notify all admins
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "ADMIN"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "🚨 SOS - Admin Chamado!",
        message: `${user.steamName} precisa de ajuda na partida. Motivo: ${args.reason}`,
        link: `/lobby/${args.matchId}`,
        type: "SYSTEM",
        read: false,
        createdAt: BigInt(Date.now()),
      });
    }

    return alertId;
  },
});

/**
 * Get pending SOS alerts (Admin)
 */
export const getPendingAlerts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") return [];

    const alerts = await ctx.db
      .query("lobby_alerts")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .order("desc")
      .collect();

    return alerts;
  },
});

/**
 * Resolve SOS alert (Admin)
 */
export const resolveAlert = mutation({
  args: { alertId: v.id("lobby_alerts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    await ctx.db.patch(args.alertId, {
      status: "RESOLVED",
      adminId: user._id,
      resolvedAt: BigInt(Date.now()),
    });

    return true;
  },
});
