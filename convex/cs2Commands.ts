import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendWarmupCommand = internalAction({
  args: {
    dathostServerId: v.string(),
    warmupTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("DatHost credentials not configured");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    const warmupTime = args.warmupTime || 30;
    
    try {
      const command = `mp_warmuptime ${warmupTime}`;
      
      const params = new URLSearchParams();
      params.append('line', command);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/game-servers/${args.dathostServerId}/console`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
          },
          body: params,
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [WARMUP CMD] Failed:", response.status, errorText);
        
        // NO FALLBACK NEEDED - transitionToLive is already scheduled in startCountdown
        // The game will transition to LIVE via lobbyReady.transitionToLive after 5 seconds
      }
    } catch (error: any) {
      console.error("Error sending warmup command:", error.message);
    }
  },
});

// Send chat message to all players
export const sendChatMessage = internalAction({
  args: {
    dathostServerId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("❌ [CHAT MSG] DatHost credentials not configured");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    try {
      const command = `say ${args.message}`;
      
      const params = new URLSearchParams();
      params.append('line', command);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/game-servers/${args.dathostServerId}/console`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [CHAT MSG] Failed:", response.status, errorText);
      }
    } catch (error: any) {
      console.error("❌ [CHAT MSG] Error:", error.message);
    }
  },
});

// Generic console command sender (FASE 20: Native CS2 commands only)
export const sendConsoleCommand = internalAction({
  args: {
    dathostServerId: v.string(),
    command: v.string(),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("❌ [CONSOLE CMD] DatHost credentials not configured");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    try {
      const params = new URLSearchParams();
      params.append('line', args.command);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/game-servers/${args.dathostServerId}/console`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [CONSOLE CMD] Failed:", args.command, response.status, errorText);
      }
    } catch (error: any) {
      console.error("❌ [CONSOLE CMD] Error:", error.message);
    }
  },
});

export const sendRestartGameCommand = internalAction({
  args: {
    dathostServerId: v.string(),
  },
  handler: async (ctx, args) => {
    // Use generic console command sender
    await ctx.runAction(internal.cs2Commands.sendConsoleCommand, {
      dathostServerId: args.dathostServerId,
      command: "mp_restartgame 1",
    });
  },
});
