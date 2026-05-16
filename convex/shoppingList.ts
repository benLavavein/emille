import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, getCurrentUser } from "./users";

function normalizeForSort(name: string): string {
  return name.trim().toLowerCase().replace(/e?s$/, "");
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { items: [] };

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

    let shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const newItem = {
      id: crypto.randomUUID(),
      name: args.name,
      amount: args.amount,
      unit: args.unit,
      checked: false,
      order: shoppingList ? shoppingList.items.length : 0,
    };

    if (shoppingList) {
      await ctx.db.patch(shoppingList._id, {
        items: [...shoppingList.items, newItem],
      });
      return shoppingList._id;
    } else {
      return await ctx.db.insert("shoppingLists", {
        userId: user._id,
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

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!shoppingList) {
      return;
    }

    await ctx.db.patch(shoppingList._id, { items: [] });
    return shoppingList._id;
  },
});

export const addFromMealPlan = mutation({
  args: {
    mealPlanId: v.id("mealPlans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const mealPlan = await ctx.db.get(args.mealPlanId);
    if (!mealPlan || mealPlan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    let shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
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
        userId: user._id,
        items: allItems,
      });
    }
  },
});
