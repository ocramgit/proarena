/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as cs2Commands from "../cs2Commands.js";
import type * as cs2LogHandlers from "../cs2LogHandlers.js";
import type * as dathost from "../dathost.js";
import type * as dathostCleanup from "../dathostCleanup.js";
import type * as dathostLive from "../dathostLive.js";
import type * as dathostLiveData from "../dathostLiveData.js";
import type * as dathostStatus from "../dathostStatus.js";
import type * as debug from "../debug.js";
import type * as debugStats from "../debugStats.js";
import type * as dev from "../dev.js";
import type * as diagnostics from "../diagnostics.js";
import type * as endgame from "../endgame.js";
import type * as forceEndGame from "../forceEndGame.js";
import type * as http from "../http.js";
import type * as liveMatch from "../liveMatch.js";
import type * as liveMatchPolling from "../liveMatchPolling.js";
import type * as lobby from "../lobby.js";
import type * as lobbyAuto from "../lobbyAuto.js";
import type * as lobbyDatHost from "../lobbyDatHost.js";
import type * as lobbyLocation from "../lobbyLocation.js";
import type * as lobbyReady from "../lobbyReady.js";
import type * as matchMonitor from "../matchMonitor.js";
import type * as matchPostGame from "../matchPostGame.js";
import type * as matchQueries from "../matchQueries.js";
import type * as matchResults from "../matchResults.js";
import type * as matchWarmup from "../matchWarmup.js";
import type * as matches from "../matches.js";
import type * as matchmaker from "../matchmaker.js";
import type * as party from "../party.js";
import type * as queue from "../queue.js";
import type * as server from "../server.js";
import type * as serverCleanup from "../serverCleanup.js";
import type * as social from "../social.js";
import type * as steamIdUtils from "../steamIdUtils.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  cs2Commands: typeof cs2Commands;
  cs2LogHandlers: typeof cs2LogHandlers;
  dathost: typeof dathost;
  dathostCleanup: typeof dathostCleanup;
  dathostLive: typeof dathostLive;
  dathostLiveData: typeof dathostLiveData;
  dathostStatus: typeof dathostStatus;
  debug: typeof debug;
  debugStats: typeof debugStats;
  dev: typeof dev;
  diagnostics: typeof diagnostics;
  endgame: typeof endgame;
  forceEndGame: typeof forceEndGame;
  http: typeof http;
  liveMatch: typeof liveMatch;
  liveMatchPolling: typeof liveMatchPolling;
  lobby: typeof lobby;
  lobbyAuto: typeof lobbyAuto;
  lobbyDatHost: typeof lobbyDatHost;
  lobbyLocation: typeof lobbyLocation;
  lobbyReady: typeof lobbyReady;
  matchMonitor: typeof matchMonitor;
  matchPostGame: typeof matchPostGame;
  matchQueries: typeof matchQueries;
  matchResults: typeof matchResults;
  matchWarmup: typeof matchWarmup;
  matches: typeof matches;
  matchmaker: typeof matchmaker;
  party: typeof party;
  queue: typeof queue;
  server: typeof server;
  serverCleanup: typeof serverCleanup;
  social: typeof social;
  steamIdUtils: typeof steamIdUtils;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
