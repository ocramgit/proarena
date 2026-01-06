import { internalMutation } from "./_generated/server";

/**
 * ONE-TIME MIGRATION: Update existing user to ADMIN role
 * Run this once to fix the admin user that was created before the role logic
 */

const ADMIN_EMAIL = "marstrabalhar@gmail.com";

export const migrateAdminUser = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all users
    const users = await ctx.db.query("users").collect();
    
    console.log(`🔍 Checking ${users.length} users for admin migration...`);
    
    let updated = 0;
    
    for (const user of users) {
      // Check if this user should be admin (you'll need to identify by clerkId or another field)
      // For now, we'll update the first user or you can manually specify the clerkId
      
      // Option 1: Update by clerkId (replace with your actual clerkId)
      // if (user.clerkId === "YOUR_CLERK_ID_HERE" && user.role !== "ADMIN") {
      
      // Option 2: Update all users with role USER to ADMIN (dangerous!)
      // if (user.role === "USER") {
      
      // For safety, let's just log the users and you can manually update
      console.log(`User: ${user.clerkId} - Role: ${user.role} - SteamName: ${user.steamName || "N/A"}`);
    }
    
    console.log(`✅ Migration check complete. Updated ${updated} users.`);
    
    return { success: true, usersChecked: users.length, usersUpdated: updated };
  },
});

/**
 * MANUAL FIX: Update specific user to ADMIN
 * Call this from Convex dashboard with your clerkId
 */
export const setUserAsAdmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find user by email metadata (if available) or manually by clerkId
    const users = await ctx.db.query("users").collect();
    
    // Update the first user to ADMIN (assuming it's you)
    // CHANGE THIS to match your actual user
    const userToUpdate = users[0]; // Or find by clerkId
    
    if (userToUpdate && userToUpdate.role !== "ADMIN") {
      await ctx.db.patch(userToUpdate._id, {
        role: "ADMIN",
      });
      
      console.log(`👑 User ${userToUpdate.clerkId} updated to ADMIN`);
      return { success: true, userId: userToUpdate._id };
    }
    
    return { success: false, message: "User already admin or not found" };
  },
});
