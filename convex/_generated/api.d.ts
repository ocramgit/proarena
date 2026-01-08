/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as adminFinance from "../adminFinance.js";
import type * as adminMigration from "../adminMigration.js";
import type * as auditLog from "../auditLog.js";
import type * as badges from "../badges.js";
import type * as crons from "../crons.js";
import type * as dathostCore from "../dathostCore.js";
import type * as debug from "../debug.js";
import type * as debugStats from "../debugStats.js";
import type * as dev from "../dev.js";
import type * as diagnostics from "../diagnostics.js";
import type * as directMessages from "../directMessages.js";
import type * as economy from "../economy.js";
import type * as friends from "../friends.js";
import type * as friendsNew from "../friendsNew.js";
import type * as http from "../http.js";
import type * as lib_logger from "../lib/logger.js";
import type * as liveMatch from "../liveMatch.js";
import type * as lobby from "../lobby.js";
import type * as lobbyLocation from "../lobbyLocation.js";
import type * as lobbyOrchestrator from "../lobbyOrchestrator.js";
import type * as logHandlers from "../logHandlers.js";
import type * as matchConfirmation from "../matchConfirmation.js";
import type * as matchEnd from "../matchEnd.js";
import type * as matchFlow from "../matchFlow.js";
import type * as matchQueries from "../matchQueries.js";
import type * as matchRoom from "../matchRoom.js";
import type * as matches from "../matches.js";
import type * as matchmaker from "../matchmaker.js";
import type * as newsroom from "../newsroom.js";
import type * as notifications from "../notifications.js";
import type * as orgInvites from "../orgInvites.js";
import type * as orgManagement from "../orgManagement.js";
import type * as orgMembers from "../orgMembers.js";
import type * as organizations from "../organizations.js";
import type * as party from "../party.js";
import type * as praccs from "../praccs.js";
import type * as profile from "../profile.js";
import type * as queue from "../queue.js";
import type * as rankings from "../rankings.js";
import type * as referrals from "../referrals.js";
import type * as social from "../social.js";
import type * as staff from "../staff.js";
import type * as staffManagement from "../staffManagement.js";
import type * as stats from "../stats.js";
import type * as steamApi from "../steamApi.js";
import type * as steamIdUtils from "../steamIdUtils.js";
import type * as stratbook from "../stratbook.js";
import type * as tickets from "../tickets.js";
import type * as tournamentOrchestrator from "../tournamentOrchestrator.js";
import type * as tournaments from "../tournaments.js";
import type * as trust from "../trust.js";
import type * as users from "../users.js";
import type * as wagerAdmin from "../wagerAdmin.js";
import type * as wagers from "../wagers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminFinance: typeof adminFinance;
  adminMigration: typeof adminMigration;
  auditLog: typeof auditLog;
  badges: typeof badges;
  crons: typeof crons;
  dathostCore: typeof dathostCore;
  debug: typeof debug;
  debugStats: typeof debugStats;
  dev: typeof dev;
  diagnostics: typeof diagnostics;
  directMessages: typeof directMessages;
  economy: typeof economy;
  friends: typeof friends;
  friendsNew: typeof friendsNew;
  http: typeof http;
  "lib/logger": typeof lib_logger;
  liveMatch: typeof liveMatch;
  lobby: typeof lobby;
  lobbyLocation: typeof lobbyLocation;
  lobbyOrchestrator: typeof lobbyOrchestrator;
  logHandlers: typeof logHandlers;
  matchConfirmation: typeof matchConfirmation;
  matchEnd: typeof matchEnd;
  matchFlow: typeof matchFlow;
  matchQueries: typeof matchQueries;
  matchRoom: typeof matchRoom;
  matches: typeof matches;
  matchmaker: typeof matchmaker;
  newsroom: typeof newsroom;
  notifications: typeof notifications;
  orgInvites: typeof orgInvites;
  orgManagement: typeof orgManagement;
  orgMembers: typeof orgMembers;
  organizations: typeof organizations;
  party: typeof party;
  praccs: typeof praccs;
  profile: typeof profile;
  queue: typeof queue;
  rankings: typeof rankings;
  referrals: typeof referrals;
  social: typeof social;
  staff: typeof staff;
  staffManagement: typeof staffManagement;
  stats: typeof stats;
  steamApi: typeof steamApi;
  steamIdUtils: typeof steamIdUtils;
  stratbook: typeof stratbook;
  tickets: typeof tickets;
  tournamentOrchestrator: typeof tournamentOrchestrator;
  tournaments: typeof tournaments;
  trust: typeof trust;
  users: typeof users;
  wagerAdmin: typeof wagerAdmin;
  wagers: typeof wagers;
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
