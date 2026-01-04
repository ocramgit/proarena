import { action } from "./_generated/server";
import { v } from "convex/values";

async function getDatHostAuth() {
  const username = process.env.DATHOST_USERNAME;
  const password = process.env.DATHOST_PASSWORD;

  if (!username || !password) {
    throw new Error("DatHost credentials not configured");
  }

  return btoa(`${username}:${password}`);
}

export const deleteGameServer = action({
  args: {
    serverId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await getDatHostAuth();

    try {
      console.log("Deleting DatHost server:", args.serverId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/game-servers/${args.serverId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to delete server: ${response.status} - ${errorText}`);
        throw new Error(`Failed to delete server: ${response.status} - ${errorText}`);
      }

      console.log("Server deleted successfully:", args.serverId);
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting server:", error);
      throw new Error(`Failed to delete server: ${error.message}`);
    }
  },
});
