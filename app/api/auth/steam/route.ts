import { NextRequest, NextResponse } from "next/server";
import { generateSteamAuthUrl } from "@/lib/steam-openid";

/**
 * Steam Authentication - Redirect to Steam OpenID
 * GET /api/auth/steam
 */
export async function GET(request: NextRequest) {
  try {
    // FASE 40: Dynamic URL detection for localhost + Vercel
    let baseUrl: string;
    
    // Priority 1: Use environment variable if set (Vercel)
    if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else {
      // Priority 2: Detect from request headers (localhost)
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const host = request.headers.get("host") || "localhost:3000";
      baseUrl = `${protocol}://${host}`;
    }

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
