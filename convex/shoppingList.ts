import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

// Get the user's shopping list
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!shoppingList) {
      return { items: [] };
    }

    // Fetch ingredient details for items that have ingredientId
    const itemsWithDetails = await Promise.all(
      shoppingList.items.map(async (item) => {
        if (item.ingredientId) {
          const ingredient = await ctx.db.get(item.ingredientId);
          return {
            ...item,
            ingredient,
          };
        }
        return { ...item, ingredient: null };
      })
    );

    return {
      ...shoppingList,
      items: itemsWithDetails.sort((a, b) => a.order - b.order),
    };
  },
});

// Add an item to the shopping list
export const addItem = mutation({
  args: {
    name: v.string(),
    ingredientId: v.optional(v.id("ingredients")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Get or create shopping list
    let shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const newItem = {
      id: crypto.randomUUID(),
      name: args.name,
      ingredientId: args.ingredientId,
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

// Toggle an item's checked status
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

// Remove an item from the shopping list
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

// Reorder items in the shopping list
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

    // Create a map for quick lookup
    const itemMap = new Map(shoppingList.items.map((item) => [item.id, item]));

    // Reorder based on provided order
    const reorderedItems = args.itemIds.map((id, index) => {
      const item = itemMap.get(id);
      if (!item) throw new Error(`Item ${id} not found`);
      return { ...item, order: index };
    });

    await ctx.db.patch(shoppingList._id, { items: reorderedItems });
    return shoppingList._id;
  },
});

// Clear all checked items
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

// Clear all items
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

// Add ingredients from a meal plan to shopping list
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

    // Get or create shopping list
    let shoppingList = await ctx.db
      .query("shoppingLists")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const existingItems = shoppingList?.items || [];
    const existingIngredientIds = new Set(
      existingItems.filter((i) => i.ingredientId).map((i) => i.ingredientId)
    );

    // Collect all ingredients from all meals in the plan
    const newItems: Array<{
      id: string;
      name: string;
      ingredientId: string;
      checked: boolean;
      order: number;
    }> = [];

    for (const mealId of mealPlan.mealIds) {
      const meal = await ctx.db.get(mealId);
      if (!meal) continue;

      for (const mealIngredient of meal.ingredients) {
        // Skip if already in list
        if (existingIngredientIds.has(mealIngredient.ingredientId)) continue;

        const ingredient = await ctx.db.get(mealIngredient.ingredientId);
        if (!ingredient) continue;

        // Check if we're about to add this ingredient
        if (newItems.some((i) => i.ingredientId === ingredient._id)) continue;

        newItems.push({
          id: crypto.randomUUID(),
          name: ingredient.name,
          ingredientId: ingredient._id,
          checked: false,
          order: existingItems.length + newItems.length,
        });
      }
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
