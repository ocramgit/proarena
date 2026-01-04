import { query } from "./_generated/server";

export const checkServerConfig = query({
  args: {},
  handler: async (ctx) => {
    // This will show us if Convex can see the auth configuration
    const identity = await ctx.auth.getUserIdentity();
    
    return {
      hasIdentity: !!identity,
      identityDetails: identity ? {
        subject: identity.subject,
        issuer: identity.issuer,
        tokenIdentifier: identity.tokenIdentifier,
      } : null,
      // Note: We can't access process.env in Convex functions
      // Environment variables are configured in the dashboard
      message: identity 
        ? "Authentication is working! Convex can validate Clerk tokens."
        : "No authentication found. Check: 1) JWT Template 'convex' exists in Clerk, 2) CLERK_ISSUER_URL is set in Convex Dashboard environment variables, 3) Both servers were restarted after configuration."
    };
  },
});
