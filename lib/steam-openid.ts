/**
 * Steam OpenID 2.0 Authentication Utilities
 * Implements secure Steam login without heavy dependencies
 */

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAM_API_URL = "https://api.steampowered.com";

interface SteamOpenIDParams {
  "openid.ns": string;
  "openid.mode": string;
  "openid.return_to": string;
  "openid.realm": string;
  "openid.identity": string;
  "openid.claimed_id": string;
}

/**
 * Generate Steam OpenID authentication URL
 */
export function generateSteamAuthUrl(returnUrl: string, realm: string): string {
  const params: SteamOpenIDParams = {
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  };

  const queryString = new URLSearchParams(params as any).toString();
  return `${STEAM_OPENID_URL}?${queryString}`;
}

/**
 * Validate Steam OpenID response
 * CRITICAL: This prevents fake SteamID injection
 */
export async function validateSteamResponse(
  queryParams: URLSearchParams
): Promise<{ valid: boolean; steamId?: string }> {
  // Check if response has required OpenID parameters
  const mode = queryParams.get("openid.mode");
  if (mode !== "id_res") {
    return { valid: false };
  }

  // Extract claimed_id which contains the SteamID64
  const claimedId = queryParams.get("openid.claimed_id");
  if (!claimedId) {
    return { valid: false };
  }

  // Extract SteamID64 from claimed_id
  // Format: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
  const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
  if (!steamIdMatch) {
    return { valid: false };
  }
  const steamId = steamIdMatch[1];

  // Validate with Steam's servers (prevent replay attacks)
  const validationParams = new URLSearchParams();
  queryParams.forEach((value, key) => {
    validationParams.append(key, value);
  });
  validationParams.set("openid.mode", "check_authentication");

  try {
    const response = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: validationParams.toString(),
    });

    const text = await response.text();
    
    // Steam returns "is_valid:true" if authentication is legitimate
    if (!text.includes("is_valid:true")) {
      console.error("❌ Steam validation failed:", text);
      return { valid: false };
    }

    console.log("✅ Steam authentication validated for SteamID:", steamId);
    return { valid: true, steamId };
  } catch (error) {
    console.error("❌ Error validating Steam response:", error);
    return { valid: false };
  }
}

/**
 * Fetch Steam player profile data
 */
export async function getSteamPlayerData(
  steamId: string,
  apiKey: string
): Promise<{
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
} | null> {
  try {
    const url = `${STEAM_API_URL}/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.response?.players?.[0]) {
      console.error("❌ No player data found for SteamID:", steamId);
      return null;
    }

    const player = data.response.players[0];

    return {
      steamId: player.steamid,
      personaName: player.personaname,
      avatarUrl: player.avatarfull || player.avatarmedium || player.avatar,
      profileUrl: player.profileurl,
    };
  } catch (error) {
    console.error("❌ Error fetching Steam player data:", error);
    return null;
  }
}

/**
 * Validate SteamID64 format
 */
export function isValidSteamId64(steamId: string): boolean {
  // SteamID64 is a 17-digit number starting with 7656119...
  return /^765611\d{11}$/.test(steamId);
}
