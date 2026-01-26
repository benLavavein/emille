import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

// Get all meals for the current user with tag details
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Fetch tag details for each meal
    const mealsWithTags = await Promise.all(
      meals.map(async (meal) => {
        const tags = await Promise.all(
          (meal.tagIds || []).map(async (tagId) => {
            const tag = await ctx.db.get(tagId);
            return tag ? { _id: tag._id, name: tag.name } : null;
          })
        );
        return {
          ...meal,
          tags: tags.filter(Boolean),
        };
      })
    );

    return mealsWithTags;
  },
});

// Get a single meal by ID with ingredient and tag details
export const get = query({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const meal = await ctx.db.get(args.id);

    if (!meal || meal.userId !== user._id) {
      return null;
    }

    // Fetch ingredient details for each ingredient in the meal
    const ingredientsWithDetails = await Promise.all(
      meal.ingredients.map(async (ing) => {
        const ingredient = await ctx.db.get(ing.ingredientId);
        return {
          ...ing,
          ingredient,
        };
      })
    );

    // Fetch tag details
    const tags = await Promise.all(
      (meal.tagIds || []).map(async (tagId) => {
        const tag = await ctx.db.get(tagId);
        return tag ? { _id: tag._id, name: tag.name } : null;
      })
    );

    return {
      ...meal,
      ingredientsWithDetails,
      tags: tags.filter(Boolean),
    };
  },
});

// Create a new meal
export const create = mutation({
  args: {
    name: v.string(),
    mealTimes: v.array(v.string()),
    tagIds: v.array(v.id("tags")),
    ingredients: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    steps: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Verify all ingredients belong to this user
    for (const ing of args.ingredients) {
      const ingredient = await ctx.db.get(ing.ingredientId);
      if (!ingredient || ingredient.userId !== user._id) {
        throw new Error("Invalid ingredient");
      }
    }

    // Verify all tags belong to this user
    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (!tag || tag.userId !== user._id) {
        throw new Error("Invalid tag");
      }
    }

    return await ctx.db.insert("meals", {
      userId: user._id,
      name: args.name,
      mealTimes: args.mealTimes,
      tagIds: args.tagIds,
      ingredients: args.ingredients,
      steps: args.steps,
      createdAt: Date.now(),
    });
  },
});

// Update a meal
export const update = mutation({
  args: {
    id: v.id("meals"),
    name: v.optional(v.string()),
    mealTimes: v.optional(v.array(v.string())),
    tagIds: v.optional(v.array(v.id("tags"))),
    ingredients: v.optional(
      v.array(
        v.object({
          ingredientId: v.id("ingredients"),
          quantity: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),
    steps: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const meal = await ctx.db.get(args.id);

    if (!meal || meal.userId !== user._id) {
      throw new Error("Meal not found");
    }

    // If updating ingredients, verify they all belong to this user
    if (args.ingredients) {
      for (const ing of args.ingredients) {
        const ingredient = await ctx.db.get(ing.ingredientId);
        if (!ingredient || ingredient.userId !== user._id) {
          throw new Error("Invalid ingredient");
        }
      }
    }

    // If updating tags, verify they all belong to this user
    if (args.tagIds) {
      for (const tagId of args.tagIds) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== user._id) {
          throw new Error("Invalid tag");
        }
      }
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.mealTimes !== undefined) updates.mealTimes = args.mealTimes;
    if (args.tagIds !== undefined) updates.tagIds = args.tagIds;
    if (args.ingredients !== undefined) updates.ingredients = args.ingredients;
    if (args.steps !== undefined) updates.steps = args.steps;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Delete a meal
export const remove = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const meal = await ctx.db.get(args.id);

    if (!meal || meal.userId !== user._id) {
      throw new Error("Meal not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
