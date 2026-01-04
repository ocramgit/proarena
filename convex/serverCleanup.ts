import { internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

export const cleanupFinishedMatchServer = internalAction({
  args: {
    dathostServerId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("Cleaning up server:", args.dathostServerId);
      await ctx.runAction(api.dathostCleanup.deleteGameServer, {
        serverId: args.dathostServerId,
      });
      console.log("Server cleanup completed");
    } catch (error) {
      console.error("Server cleanup failed:", error);
    }
  },
});

// Stop DatHost server immediately (fail-safe for timeout)
export const stopServer = internalAction({
  args: {
    serverId: v.string(),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("DatHost credentials not configured");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    try {
      console.log("🛑 Stopping DatHost server:", args.serverId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/game-servers/${args.serverId}/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to stop server:", response.statusText);
        return;
      }

      console.log("✅ Server stopped successfully");
    } catch (error: any) {
      console.error("Error stopping server:", error.message);
    }
  },
});
