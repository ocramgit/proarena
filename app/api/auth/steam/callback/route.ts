import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { validateSteamResponse, getSteamPlayerData, isValidSteamId64 } from "@/lib/steam-openid";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Steam Authentication Callback
 * GET /api/auth/steam/callback
 * 
 * SECURITY: Validates Steam OpenID response to prevent fake SteamID injection
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated with Clerk
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ User not authenticated with Clerk");
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Get query parameters from Steam's callback
    const searchParams = request.nextUrl.searchParams;
    
    console.log("🎮 Steam callback received for user:", userId);

    // STEP 1: Validate Steam OpenID response (CRITICAL SECURITY)
    const validation = await validateSteamResponse(searchParams);
    
    if (!validation.valid || !validation.steamId) {
      console.error("❌ Invalid Steam authentication response");
      return NextResponse.redirect(
        new URL("/profile?error=steam_validation_failed", request.url)
      );
    }

    const steamId = validation.steamId;
    console.log("✅ Steam authentication validated. SteamID:", steamId);

    // STEP 2: Validate SteamID64 format
    if (!isValidSteamId64(steamId)) {
      console.error("❌ Invalid SteamID64 format:", steamId);
      return NextResponse.redirect(
        new URL("/profile?error=invalid_steamid", request.url)
      );
    }

    // STEP 3: Fetch player data from Steam API
    const apiKey = process.env.STEAM_WEB_API_KEY;
    if (!apiKey) {
      console.error("❌ STEAM_WEB_API_KEY not configured");
      return NextResponse.redirect(
        new URL("/profile?error=server_config", request.url)
      );
    }

    const playerData = await getSteamPlayerData(steamId, apiKey);
    if (!playerData) {
      console.error("❌ Failed to fetch Steam player data");
      return NextResponse.redirect(
        new URL("/profile?error=steam_api_failed", request.url)
      );
    }

    console.log("✅ Steam player data fetched:", playerData.personaName);

    // STEP 4: Link Steam account to user in Convex
    try {
      await convex.mutation(api.users.linkSteamAccount, {
        clerkId: userId,
        steamId: playerData.steamId,
        steamName: playerData.personaName,
        steamAvatar: playerData.avatarUrl,
        steamProfileUrl: playerData.profileUrl,
      });

      console.log("✅ Steam account linked successfully");

      // Redirect to home - nickname setup modal will show if needed
      return NextResponse.redirect(
        new URL("/?steam_linked=true", request.url)
      );
    } catch (error) {
      console.error("❌ Error linking Steam account to Convex:", error);
      return NextResponse.redirect(
        new URL("/profile?error=database_error", request.url)
      );
    }
  } catch (error) {
    console.error("❌ Unexpected error in Steam callback:", error);
    return NextResponse.redirect(
      new URL("/profile?error=unexpected_error", request.url)
    );
  }
}
