import { NextRequest, NextResponse } from "next/server";
import { generateSteamAuthUrl } from "@/lib/steam-openid";

/**
 * Steam Authentication - Redirect to Steam OpenID
 * GET /api/auth/steam
 */
export async function GET(request: NextRequest) {
  try {
    // Get the base URL from the request
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Define callback URL
    const callbackUrl = `${baseUrl}/api/auth/steam/callback`;
    const realm = baseUrl;

    // Generate Steam OpenID authentication URL
    const authUrl = generateSteamAuthUrl(callbackUrl, realm);

    console.log("🎮 Redirecting to Steam authentication...");
    console.log("Callback URL:", callbackUrl);

    // Redirect user to Steam login
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("❌ Error initiating Steam auth:", error);
    return NextResponse.json(
      { error: "Failed to initiate Steam authentication" },
      { status: 500 }
    );
  }
}
