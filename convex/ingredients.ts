import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

// Get all ingredients for the current user with store details and meal usage counts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const ingredients = await ctx.db
      .query("ingredients")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const ingredientsWithDetails = await Promise.all(
      ingredients.map(async (ing) => {
        const primaryStoreId = ing.storeLocations?.[0]?.storeId;
        const storeDoc = primaryStoreId
          ? await ctx.db.get(primaryStoreId)
          : null;
        const usedInCount = meals.filter((meal) =>
          meal.ingredients.some((mi) => mi.ingredientId === ing._id)
        ).length;
        return {
          ...ing,
          store:
            storeDoc && "name" in storeDoc
              ? { _id: storeDoc._id, name: storeDoc.name }
              : null,
          usedInCount,
        };
      })
    );

    return ingredientsWithDetails;
  },
});

// Get a single ingredient by ID
export const get = query({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ingredient = await ctx.db.get(args.id);

    if (!ingredient || ingredient.userId !== user._id) {
      return null;
    }

    return ingredient;
  },
});

// Create a new ingredient
export const create = mutation({
  args: {
    name: v.string(),
    storeId: v.optional(v.id("groceryStores")),
    storeSectionName: v.optional(v.string()),
    defaultQuantityType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check if ingredient with same name already exists
    const existing = await ctx.db
      .query("ingredients")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", user._id).eq("name", args.name)
      )
      .unique();

    if (existing) {
      throw new Error(`Ingredient "${args.name}" already exists`);
    }

    // Verify store belongs to user if provided
    if (args.storeId) {
      const store = await ctx.db.get(args.storeId);
      if (!store || store.userId !== user._id) {
        throw new Error("Invalid store");
      }
    }

    return await ctx.db.insert("ingredients", {
      userId: user._id,
      name: args.name,
      storeLocations:
        args.storeId !== undefined
          ? [
              {
                storeId: args.storeId,
                sectionName: args.storeSectionName ?? "",
              },
            ]
          : undefined,
      defaultQuantityType: args.defaultQuantityType,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

// Update an ingredient
export const update = mutation({
  args: {
    id: v.id("ingredients"),
    name: v.optional(v.string()),
    storeId: v.optional(v.id("groceryStores")),
    storeSectionName: v.optional(v.string()),
    defaultQuantityType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ingredient = await ctx.db.get(args.id);

    if (!ingredient || ingredient.userId !== user._id) {
      throw new Error("Ingredient not found");
    }

    // Verify store belongs to user if provided
    if (args.storeId) {
      const store = await ctx.db.get(args.storeId);
      if (!store || store.userId !== user._id) {
        throw new Error("Invalid store");
      }
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.storeId !== undefined || args.storeSectionName !== undefined) {
      if (args.storeId !== undefined) {
        updates.storeLocations = [
          {
            storeId: args.storeId,
            sectionName:
              args.storeSectionName ??
              ingredient.storeLocations?.[0]?.sectionName ??
              "",
          },
        ];
      } else if (args.storeSectionName !== undefined) {
        const locs = ingredient.storeLocations;
        if (locs?.length) {
          updates.storeLocations = [
            { ...locs[0], sectionName: args.storeSectionName },
            ...locs.slice(1),
          ];
        }
      }
    }
    if (args.defaultQuantityType !== undefined) updates.defaultQuantityType = args.defaultQuantityType;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Delete an ingredient (only if not used in any meal)
export const remove = mutation({
  args: { id: v.id("ingredients") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const ingredient = await ctx.db.get(args.id);

    if (!ingredient || ingredient.userId !== user._id) {
      throw new Error("Ingredient not found");
    }

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const usedIn = meals.filter((meal) =>
      meal.ingredients.some((ing) => ing.ingredientId === args.id)
    );

    if (usedIn.length > 0) {
      const names = usedIn.map((m) => m.name).join(", ");
      throw new Error(
        `Cannot delete "${ingredient.name}" because it is used in: ${names}`
      );
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
