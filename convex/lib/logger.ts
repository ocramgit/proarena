/**
 * PHASE 60: Production Logger Utility
 * Replaces console.log with structured, toggleable logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Set to "info" in production, "debug" in development
const CURRENT_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatMessage(prefix: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
  return `[${timestamp}] ${prefix} ${message}${dataStr}`;
}

export const logger = {
  debug: (prefix: string, message: string, data?: unknown) => {
    if (shouldLog("debug")) {
      console.log(formatMessage(`🔍 [${prefix}]`, message, data));
    }
  },

  info: (prefix: string, message: string, data?: unknown) => {
    if (shouldLog("info")) {
      console.log(formatMessage(`ℹ️ [${prefix}]`, message, data));
    }
  },

  warn: (prefix: string, message: string, data?: unknown) => {
    if (shouldLog("warn")) {
      console.warn(formatMessage(`⚠️ [${prefix}]`, message, data));
    }
  },

  error: (prefix: string, message: string, data?: unknown) => {
    if (shouldLog("error")) {
      console.error(formatMessage(`❌ [${prefix}]`, message, data));
    }
  },

  // Specialized loggers for common patterns
  match: (action: string, matchId: string, data?: unknown) => {
    logger.info("MATCH", `${action} | Match: ${matchId}`, data);
  },

  server: (action: string, serverId: string, data?: unknown) => {
    logger.info("SERVER", `${action} | Server: ${serverId}`, data);
  },

  user: (action: string, userId: string, data?: unknown) => {
    logger.debug("USER", `${action} | User: ${userId}`, data);
  },

  wager: (action: string, wagerId: string, data?: unknown) => {
    logger.info("WAGER", `${action} | Wager: ${wagerId}`, data);
  },

  tournament: (action: string, tournamentId: string, data?: unknown) => {
    logger.info("TOURNAMENT", `${action} | Tournament: ${tournamentId}`, data);
  },
};

export default logger;
