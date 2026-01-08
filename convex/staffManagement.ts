import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 55: STAFF MANAGEMENT & NEWS GOVERNANCE
 * RBAC for news creation - ADMIN and REDATOR roles
 */

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "marstrabalhar@gmail.com";

// Check if user is ADMIN (can manage staff)
async function isAdmin(ctx: any): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return false;
  
  if (identity.email === SUPER_ADMIN_EMAIL) return true;
  
  const staffMember = await ctx.db
    .query("staff_members")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();
  
  return staffMember?.role === "ADMIN";
}

// Check if user can write news (ADMIN or REDATOR)
async function canWriteNews(ctx: any): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return false;
  
  if (identity.email === SUPER_ADMIN_EMAIL) return true;
  
  const staffMember = await ctx.db
    .query("staff_members")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();
  
  return staffMember && (staffMember.role === "ADMIN" || staffMember.role === "REDATOR");
}

/**
 * Check if current user is admin
 */
export const checkIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await isAdmin(ctx);
  },
});

/**
 * Check if current user can write news (ADMIN or REDATOR)
 */
export const checkCanWriteNews = query({
  args: {},
  handler: async (ctx) => {
    return await canWriteNews(ctx);
  },
});

/**
 * Get current user's staff role
 */
export const getMyStaffRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) return null;
    
    if (identity.email === SUPER_ADMIN_EMAIL) {
      return { role: "ADMIN" as const, email: identity.email!, isSuperAdmin: true };
    }
    
    const staffMember = await ctx.db
      .query("staff_members")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    
    if (!staffMember) return null;
    
    return {
      role: staffMember.role,
      email: identity.email,
      isSuperAdmin: false,
    };
  },
});

/**
 * Get all staff members (admin only)
 */
export const getAllStaff = query({
  args: {},
  handler: async (ctx) => {
    const canAccess = await isAdmin(ctx);
    if (!canAccess) return [];
    
    const staffMembers = await ctx.db.query("staff_members").collect();
    
    return await Promise.all(staffMembers.map(async (staff) => {
      // Try to find user by email
      const user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("clerkId"), staff.email))
        .first();
      
      const addedByUser = await ctx.db.get(staff.addedBy);
      
      return {
        _id: staff._id,
        email: staff.email,
        role: staff.role,
        addedAt: Number(staff.addedAt),
        addedBy: addedByUser?.nickname || addedByUser?.steamName || "Unknown",
        user: user ? {
          nickname: user.nickname,
          steamName: user.steamName,
          steamAvatar: user.steamAvatar,
        } : null,
      };
    }));
  },
});

/**
 * Add staff member (admin only)
 */
export const addStaffMember = mutation({
  args: {
    email: v.string(),
    role: v.union(
      v.literal("ADMIN"),
      v.literal("SUPPORT"),
      v.literal("ORGANIZER"),
      v.literal("REDATOR")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const canAdd = await isAdmin(ctx);
    if (!canAdd) throw new Error("Acesso negado. Apenas ADMIN pode adicionar staff.");
    
    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!currentUser) throw new Error("User not found");
    
    // Check if already exists
    const existing = await ctx.db
      .query("staff_members")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    
    if (existing) {
      throw new Error("Este email já está registado como staff.");
    }
    
    // Add staff member
    const staffId = await ctx.db.insert("staff_members", {
      email: args.email.toLowerCase(),
      role: args.role,
      addedBy: currentUser._id,
      addedAt: BigInt(Date.now()),
    });
    
    console.log(`✅ Staff added: ${args.email} as ${args.role}`);
    
    return staffId;
  },
});

/**
 * Update staff member role (admin only)
 */
export const updateStaffRole = mutation({
  args: {
    staffId: v.id("staff_members"),
    role: v.union(
      v.literal("ADMIN"),
      v.literal("SUPPORT"),
      v.literal("ORGANIZER"),
      v.literal("REDATOR")
    ),
  },
  handler: async (ctx, args) => {
    const canUpdate = await isAdmin(ctx);
    if (!canUpdate) throw new Error("Acesso negado. Apenas ADMIN pode atualizar roles.");
    
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff member not found");
    
    await ctx.db.patch(args.staffId, {
      role: args.role,
    });
    
    console.log(`✅ Staff role updated: ${staff.email} -> ${args.role}`);
  },
});

/**
 * Remove staff member (admin only)
 */
export const removeStaffMember = mutation({
  args: {
    staffId: v.id("staff_members"),
  },
  handler: async (ctx, args) => {
    const canRemove = await isAdmin(ctx);
    if (!canRemove) throw new Error("Acesso negado. Apenas ADMIN pode remover staff.");
    
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff member not found");
    
    await ctx.db.delete(args.staffId);
    
    console.log(`❌ Staff removed: ${staff.email}`);
  },
});

/**
 * Get all redators (for author selection)
 */
export const getRedators = query({
  args: {},
  handler: async (ctx) => {
    const canAccess = await canWriteNews(ctx);
    if (!canAccess) return [];
    
    const staffMembers = await ctx.db
      .query("staff_members")
      .collect();
    
    const redators = staffMembers.filter(
      (s) => s.role === "ADMIN" || s.role === "REDATOR"
    );
    
    return redators.map((r) => ({
      email: r.email,
      role: r.role,
    }));
  },
});
