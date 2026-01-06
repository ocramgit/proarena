import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * FASE 35: STAFF MANAGEMENT & RBAC
 * Sistema hierárquico: SUPER_ADMIN > ADMIN > SUPPORT
 */

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "marstrabalhar@gmail.com";

/**
 * Get staff role for a given email
 * Returns: "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | null
 */
export const getStaffRole = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // 1. Check if Super Admin
    if (args.email === SUPER_ADMIN_EMAIL) {
      return "SUPER_ADMIN";
    }

    // 2. Check if in staff_members table
    const staffMember = await ctx.db
      .query("staff_members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (staffMember) {
      return staffMember.role; // "ADMIN" or "SUPPORT"
    }

    // 3. Regular user
    return null;
  },
});

/**
 * Get current user's staff role
 */
export const getMyStaffRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email) {
      return null;
    }

    const email = identity.email;

    // Check if Super Admin
    if (email === SUPER_ADMIN_EMAIL) {
      return "SUPER_ADMIN";
    }

    // Check if in staff_members table
    const staffMember = await ctx.db
      .query("staff_members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (staffMember) {
      return staffMember.role;
    }

    return null;
  },
});

/**
 * Get all staff members (Super Admin only)
 */
export const getAllStaff = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email || identity.email !== SUPER_ADMIN_EMAIL) {
      throw new Error("Acesso negado. Apenas Super Admin.");
    }

    const staff = await ctx.db.query("staff_members").collect();

    return staff.map((member) => ({
      _id: member._id,
      email: member.email,
      role: member.role,
      addedAt: member.addedAt,
    }));
  },
});

/**
 * Add staff member (Super Admin only)
 */
export const addStaffMember = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("ADMIN"), v.literal("SUPPORT")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email || identity.email !== SUPER_ADMIN_EMAIL) {
      throw new Error("Acesso negado. Apenas Super Admin.");
    }

    // Validate email format
    if (!args.email.includes("@")) {
      throw new Error("Email inválido");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("staff_members")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Este email já está na equipa");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Add staff member
    const staffId = await ctx.db.insert("staff_members", {
      email: args.email,
      role: args.role,
      addedBy: currentUser._id,
      addedAt: BigInt(Date.now()),
    });

    console.log(`✅ Staff member added: ${args.email} as ${args.role}`);

    return staffId;
  },
});

/**
 * Remove staff member (Super Admin only)
 */
export const removeStaffMember = mutation({
  args: {
    staffId: v.id("staff_members"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.email || identity.email !== SUPER_ADMIN_EMAIL) {
      throw new Error("Acesso negado. Apenas Super Admin.");
    }

    await ctx.db.delete(args.staffId);

    console.log(`✅ Staff member removed`);

    return { success: true };
  },
});
