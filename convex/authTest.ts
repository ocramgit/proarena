import { mutation } from "./_generated/server";

export const testAuthDetailed = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      
      return {
        success: true,
        hasIdentity: !!identity,
        identity: identity ? {
          subject: identity.subject,
          issuer: identity.issuer,
          tokenIdentifier: identity.tokenIdentifier,
        } : null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  },
});
