/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as groceryStores from "../groceryStores.js";
import type * as importRecipe from "../importRecipe.js";
import type * as ingredients from "../ingredients.js";
import type * as mealPlans from "../mealPlans.js";
import type * as meals from "../meals.js";
import type * as shoppingList from "../shoppingList.js";
import type * as tags from "../tags.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  groceryStores: typeof groceryStores;
  importRecipe: typeof importRecipe;
  ingredients: typeof ingredients;
  mealPlans: typeof mealPlans;
  meals: typeof meals;
  shoppingList: typeof shoppingList;
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

export declare const components: {};
