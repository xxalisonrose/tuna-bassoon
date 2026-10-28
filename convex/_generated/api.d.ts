/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminBadgeArtwork from "../adminBadgeArtwork.js";
import type * as adminBadgeAvailability from "../adminBadgeAvailability.js";
import type * as adminBadgeCongratulations from "../adminBadgeCongratulations.js";
import type * as adminBadges from "../adminBadges.js";
import type * as adminIngest from "../adminIngest.js";
import type * as adminLocations from "../adminLocations.js";
import type * as adminUsers from "../adminUsers.js";
import type * as annualBadgeEditions from "../annualBadgeEditions.js";
import type * as badgeMigration from "../badgeMigration.js";
import type * as badges from "../badges.js";
import type * as betaFeedback from "../betaFeedback.js";
import type * as betaStarter from "../betaStarter.js";
import type * as communityAccess from "../communityAccess.js";
import type * as contentLocationLookup from "../contentLocationLookup.js";
import type * as crons from "../crons.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_avatarEconomy from "../lib/avatarEconomy.js";
import type * as lib_badge_congratulations from "../lib/badge_congratulations.js";
import type * as lib_badge_rules from "../lib/badge_rules.js";
import type * as lib_communityContributor from "../lib/communityContributor.js";
import type * as lib_contentModeration from "../lib/contentModeration.js";
import type * as lib_contentSubmissionSuggestions from "../lib/contentSubmissionSuggestions.js";
import type * as lib_locationMapPin from "../lib/locationMapPin.js";
import type * as lib_username from "../lib/username.js";
import type * as locationAgent from "../locationAgent.js";
import type * as locations from "../locations.js";
import type * as lorcoins from "../lorcoins.js";
import type * as missions from "../missions.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as visits from "../visits.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminBadgeArtwork: typeof adminBadgeArtwork;
  adminBadgeAvailability: typeof adminBadgeAvailability;
  adminBadgeCongratulations: typeof adminBadgeCongratulations;
  adminBadges: typeof adminBadges;
  adminIngest: typeof adminIngest;
  adminLocations: typeof adminLocations;
  adminUsers: typeof adminUsers;
  annualBadgeEditions: typeof annualBadgeEditions;
  badgeMigration: typeof badgeMigration;
  badges: typeof badges;
  betaFeedback: typeof betaFeedback;
  betaStarter: typeof betaStarter;
  communityAccess: typeof communityAccess;
  contentLocationLookup: typeof contentLocationLookup;
  crons: typeof crons;
  "lib/auth": typeof lib_auth;
  "lib/avatarEconomy": typeof lib_avatarEconomy;
  "lib/badge_congratulations": typeof lib_badge_congratulations;
  "lib/badge_rules": typeof lib_badge_rules;
  "lib/communityContributor": typeof lib_communityContributor;
  "lib/contentModeration": typeof lib_contentModeration;
  "lib/contentSubmissionSuggestions": typeof lib_contentSubmissionSuggestions;
  "lib/locationMapPin": typeof lib_locationMapPin;
  "lib/username": typeof lib_username;
  locationAgent: typeof locationAgent;
  locations: typeof locations;
  lorcoins: typeof lorcoins;
  missions: typeof missions;
  seed: typeof seed;
  users: typeof users;
  visits: typeof visits;
  wishlist: typeof wishlist;
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

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
};
