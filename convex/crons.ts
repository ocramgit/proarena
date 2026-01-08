import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "matchmaker",
  { seconds: 10 },
  internal.matchmaker.checkMatches
);

// FASE 54: Weekly rankings update (every Monday at 00:00 UTC)
crons.weekly(
  "weekly-rankings",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
  internal.rankings.calculateWeeklyRankings
);

// FASE 52: Tournament match dispatcher (check for ready matches)
crons.interval(
  "tournament-dispatcher",
  { minutes: 1 },
  internal.tournamentOrchestrator.dispatchTournamentMatches
);

export default crons;
