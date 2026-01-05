// Steam ID conversion utilities
// CS2 uses STEAM_0:1:X format in logs
// But some systems use SteamID64 format

export function steamId64ToSteamId(steamId64: string): string {
  // Convert SteamID64 to STEAM_0:1:X format
  const steamId64Num = BigInt(steamId64);
  const accountId = steamId64Num - BigInt("76561197960265728");
  const y = accountId % BigInt(2);
  const z = (accountId - y) / BigInt(2);
  return `STEAM_0:${y}:${z}`;
}

export function steamIdToSteamId64(steamId: string): string {
  // Handle STEAM_0:X:Y or STEAM_1:X:Y format
  const match = steamId.match(/STEAM_[0-1]:([0-1]):(\d+)/);
  if (!match) {
    // Handle [U:1:XXXXXX] format
    const uMatch = steamId.match(/\[U:1:(\d+)\]/);
    if (uMatch) {
      const accountId = parseInt(uMatch[1]);
      const steamId64 = BigInt(76561197960265728) + BigInt(accountId);
      return steamId64.toString();
    }
    throw new Error(`Invalid Steam ID format: ${steamId}`);
  }

  const [, y, z] = match;
  const accountId = parseInt(z) * 2 + parseInt(y);
  const steamId64 = BigInt(76561197960265728) + BigInt(accountId);
  
  return steamId64.toString();
}

// Normalize any SteamID format to SteamID64 for consistent matching
export function normalizeSteamId(steamId: string): string {
  // Already SteamID64 (17 digits)
  if (/^\d{17}$/.test(steamId)) {
    return steamId;
  }
  
  // STEAM_0:X:Y or STEAM_1:X:Y format
  if (steamId.startsWith("STEAM_")) {
    return steamIdToSteamId64(steamId);
  }
  
  // [U:1:X] format
  if (steamId.startsWith("[U:1:")) {
    return steamIdToSteamId64(steamId);
  }
  
  // Unknown format, return as-is
  console.warn("⚠️ Unknown SteamID format:", steamId);
  return steamId;
}
