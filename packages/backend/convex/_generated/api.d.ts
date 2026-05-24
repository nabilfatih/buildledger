/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiSettings from "../aiSettings.js";
import type * as documents from "../documents.js";
import type * as investigations from "../investigations.js";
import type * as memory from "../memory.js";
import type * as projects from "../projects.js";
import type * as protocols from "../protocols.js";
import type * as records from "../records.js";
import type * as reports from "../reports.js";
import type * as shares from "../shares.js";
import type * as taxonomy from "../taxonomy.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiSettings: typeof aiSettings;
  documents: typeof documents;
  investigations: typeof investigations;
  memory: typeof memory;
  projects: typeof projects;
  protocols: typeof protocols;
  records: typeof records;
  reports: typeof reports;
  shares: typeof shares;
  taxonomy: typeof taxonomy;
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
