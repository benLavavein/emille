import { v } from "convex/values";
import { internalMutation, mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { requireUser, getCurrentUser } from "./users";
import { getMySoulmateRow } from "./soulmates";
import type { Id } from "./_generated/dataModel";
import { isStoreSectionId } from "../shared/storeSections";

/** Returns the userId whose shoppingLists document should be used.
 *  If shopping list sharing is active, that's always user1Id (the soulmate sender). */
async function resolveListOwner(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Id<"users">> {
  const soulmateResult = await getMySoulmateRow(ctx, userId);
  if (soulmateResult && soulmateResult.row.sharing.shoppingList) {
    return soulmateResult.row.user1Id;
  }
  return userId;
}

function normalizeForSort(name: string): string {
  return name.trim().toLowerCase().replace(/e?s$/, "");
}

/** Saves newly classified terms. The normalized-name index is the cache's fast exact lookup. */
export const cacheCategories = internalMutation({
  args: {
    entries: v.array(v.object({ normalizedName: v.string(), sectionId: v.string() })),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      if (!isStoreSectionId(entry.sectionId)) continue;
      const existing = await ctx.db
        .query("itemSectionCache")
        .withIndex("by_normalized_name", (q) => q.eq("normalizedName", entry.normalizedName))
        .unique();
      if (!existing) await ctx.db.insert("itemSectionCache", entry);
    }
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { items: [] };

    const listOwner = await resolveListOwner(ctx, user._id);
    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    if (!shoppingList) {
      return { items: [] };
    }

    return {
      ...shoppingList,
      items: [...shoppingList.items].sort((a, b) => a.order - b.order),
    };
  },
});

export const addItem = mutation({
  args: {
    name: v.string(),
    amount: v.optional(v.float64()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    let shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    const newItem = {
      id: crypto.randomUUID(),
      name: args.name,
      amount: args.amount,
      unit: args.unit,
      checked: false,
      order: 0,
    };

    if (shoppingList) {
      await ctx.db.patch(shoppingList._id, {
        items: [
          newItem,
          ...shoppingList.items.map((item) => ({
            ...item,
            order: item.order + 1,
          })),
        ],
      });
      return shoppingList._id;
    } else {
      return await ctx.db.insert("shoppingLists", {
        userId: listOwner,
        items: [newItem],
      });
    }
  },
});

export const toggleItem = mutation({
  args: {
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    if (!shoppingList) {
      throw new Error("Shopping list not found");
    }

    const updatedItems = shoppingList.items.map((item) =>
      item.id === args.itemId ? { ...item, checked: !item.checked } : item
    );

    await ctx.db.patch(shoppingList._id, { items: updatedItems });
    return shoppingList._id;
  },
});

export const removeItem = mutation({
  args: {
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    if (!shoppingList) {
      throw new Error("Shopping list not found");
    }

    const updatedItems = shoppingList.items
      .filter((item) => item.id !== args.itemId)
      .map((item, index) => ({ ...item, order: index }));

    await ctx.db.patch(shoppingList._id, { items: updatedItems });
    return shoppingList._id;
  },
});

export const reorderItems = mutation({
  args: {
    itemIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    if (!shoppingList) {
      throw new Error("Shopping list not found");
    }

    const itemMap = new Map(shoppingList.items.map((item) => [item.id, item]));

    const reorderedItems = args.itemIds.map((id, index) => {
      const item = itemMap.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      return { ...item, order: index };
    });

    await ctx.db.patch(shoppingList._id, { items: reorderedItems });
    return shoppingList._id;
  },
});

export const clearChecked = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    if (!shoppingList) {
      return;
    }

    const uncheckedItems = shoppingList.items
      .filter((item) => !item.checked)
      .map((item, index) => ({ ...item, order: index }));

    await ctx.db.patch(shoppingList._id, { items: uncheckedItems });
    return shoppingList._id;
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    if (!shoppingList) {
      return;
    }

    await ctx.db.patch(shoppingList._id, { items: [] });
    return shoppingList._id;
  },
});

export const addFromMeal = mutation({
  args: {
    mealId: v.id("meals"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const meal = await ctx.db.get(args.mealId);

    if (!meal) {
      throw new Error("Meal not found");
    }

    if (meal.userId !== user._id) {
      const soulmateResult = await getMySoulmateRow(ctx, user._id);
      const partnerId = soulmateResult
        ? soulmateResult.row.user1Id === user._id
          ? soulmateResult.row.user2Id
          : soulmateResult.row.user1Id
        : null;

      if (
        !soulmateResult?.row.sharing.meals ||
        meal.userId !== partnerId
      ) {
        throw new Error("Meal not found");
      }
    }

    const listOwner = await resolveListOwner(ctx, user._id);
    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();
    const existingItems = shoppingList?.items ?? [];
    const startOrder = existingItems.length;
    const newItems = meal.ingredients.map((ingredient, index) => ({
      id: crypto.randomUUID(),
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      notes: ingredient.notes,
      mealName: meal.name,
      checked: false,
      order: startOrder + index,
    }));
    const items = [...existingItems, ...newItems];

    const shoppingListId = shoppingList
      ? shoppingList._id
      : await ctx.db.insert("shoppingLists", {
          userId: listOwner,
          items,
        });

    if (shoppingList) {
      await ctx.db.patch(shoppingList._id, { items });
    }

    return { shoppingListId, addedCount: newItems.length };
  },
});

export const addFromMealPlan = mutation({
  args: {
    mealPlanId: v.id("mealPlans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const listOwner = await resolveListOwner(ctx, user._id);

    const mealPlan = await ctx.db.get(args.mealPlanId);
    if (!mealPlan || mealPlan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    let shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", listOwner))
      .first();

    const existingItems = shoppingList?.items || [];

    const mealIds = [
      ...new Set([
        ...mealPlan.breakfastMealIds,
        ...mealPlan.lunchMealIds,
        ...mealPlan.dinnerMealIds,
      ]),
    ];

    const newItems: Array<{
      id: string;
      name: string;
      amount?: number;
      unit?: string;
      notes?: string;
      mealName?: string;
      checked: boolean;
      order: number;
    }> = [];

    for (const mealId of mealIds) {
      const meal = await ctx.db.get(mealId);
      if (!meal) continue;

      for (const mealIngredient of meal.ingredients) {
        newItems.push({
          id: crypto.randomUUID(),
          name: mealIngredient.name,
          amount: mealIngredient.amount,
          unit: mealIngredient.unit,
          notes: mealIngredient.notes,
          mealName: meal.name,
          checked: false,
          order: 0,
        });
      }
    }

    // Sort new items by normalized name so similar ingredients cluster together
    newItems.sort((a, b) =>
      normalizeForSort(a.name).localeCompare(normalizeForSort(b.name))
    );

    // Assign order values: existing items keep theirs, new items follow after
    const startOrder = existingItems.length;
    for (let i = 0; i < newItems.length; i++) {
      newItems[i].order = startOrder + i;
    }

    const allItems = [...existingItems, ...newItems];

    if (shoppingList) {
      await ctx.db.patch(shoppingList._id, { items: allItems });
      return shoppingList._id;
    } else {
      return await ctx.db.insert("shoppingLists", {
        userId: listOwner,
        items: allItems,
      });
    }
  },
});
