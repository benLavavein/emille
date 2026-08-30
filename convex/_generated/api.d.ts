/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_models from "../ai/models.js";
import type * as ai_recipeCleanup from "../ai/recipeCleanup.js";
import type * as ai_shoppingListOrder from "../ai/shoppingListOrder.js";
import type * as auth from "../auth.js";
import type * as clerkMigration from "../clerkMigration.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as importRecipe from "../importRecipe.js";
import type * as mealPlans from "../mealPlans.js";
import type * as mealShares from "../mealShares.js";
import type * as meals from "../meals.js";
import type * as shoppingList from "../shoppingList.js";
import type * as soulmates from "../soulmates.js";
import type * as tags from "../tags.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/models": typeof ai_models;
  "ai/recipeCleanup": typeof ai_recipeCleanup;
  "ai/shoppingListOrder": typeof ai_shoppingListOrder;
  auth: typeof auth;
  clerkMigration: typeof clerkMigration;
  friends: typeof friends;
  http: typeof http;
  importRecipe: typeof importRecipe;
  mealPlans: typeof mealPlans;
  mealShares: typeof mealShares;
  meals: typeof meals;
  shoppingList: typeof shoppingList;
  soulmates: typeof soulmates;
  tags: typeof tags;
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

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
