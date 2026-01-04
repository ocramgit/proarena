import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const provisionServer = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    console.log("Step 1: Creating Server...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Step 2: Installing CS2...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const fakeIp = `185.200.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:27015`;

    console.log("Step 3: Server ready at", fakeIp);

    await ctx.runMutation(internal.server.updateMatchServer, {
      matchId: args.matchId,
      serverIp: fakeIp,
    });

    return {
      success: true,
      serverIp: fakeIp,
      message: "Server provisioned successfully",
    };
  },
});

export const updateMatchServer = internalMutation({
  args: {
    matchId: v.id("matches"),
    serverIp: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.matchId, {
      serverIp: args.serverIp,
      state: "LIVE",
    });

    return { success: true };
  },
});
