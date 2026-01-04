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
  // Convert STEAM_0:1:X format to SteamID64
  const match = steamId.match(/STEAM_0:([01]):(\d+)/);
  if (!match) return steamId;
  
  const y = BigInt(match[1]);
  const z = BigInt(match[2]);
  const accountId = z * BigInt(2) + y;
  const steamId64 = accountId + BigInt("76561197960265728");
  return steamId64.toString();
}

export function normalizeSteamId(steamId: string): { steamId: string; steamId64: string } {
  // Returns both formats
  if (steamId.startsWith("STEAM_0:")) {
    return {
      steamId: steamId,
      steamId64: steamIdToSteamId64(steamId),
    };
  } else if (steamId.match(/^\d{17}$/)) {
    // Looks like SteamID64
    return {
      steamId: steamId64ToSteamId(steamId),
      steamId64: steamId,
    };
  }
  
  // Unknown format, return as-is
  return {
    steamId: steamId,
    steamId64: steamId,
  };
}
