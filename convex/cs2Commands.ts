import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendWarmupCommand = internalAction({
  args: {
    dathostServerId: v.string(),
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
      console.log("Sending mp_warmuptime 10 command to server:", args.dathostServerId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/game-servers/${args.dathostServerId}/console`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            line: "mp_warmuptime 10",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send warmup command:", response.status, response.statusText, errorText);
      } else {
        console.log("✅ Warmup time reduced to 10 seconds successfully!");
        
        // Schedule fallback to force LIVE state after 15 seconds (10s warmup + 5s buffer)
        await ctx.scheduler.runAfter(15 * 1000, internal.cs2Commands.forceGameStart, {
          dathostServerId: args.dathostServerId,
        });
      }
    } catch (error: any) {
      console.error("Error sending warmup command:", error.message);
    }
  },
});

export const forceGameStart = internalAction({
  args: {
    dathostServerId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("⏰ Fallback: Forcing game start after warmup timeout");
    
    // Call handleGameStart to transition to LIVE
    await ctx.runMutation(internal.cs2LogHandlers.handleGameStart, {});
  },
});
