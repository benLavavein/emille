import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

type Step = { text: string; timerSeconds?: number };

function normalizeSteps(steps: (string | Step)[]): Step[] {
  return steps.map((s) => (typeof s === "string" ? { text: s } : s));
}

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
          steps: normalizeSteps(meal.steps),
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

    const ingredientsWithDetails = await Promise.all(
      meal.ingredients.map(async (ing) => {
        const ingredient = ing.ingredientId
          ? await ctx.db.get(ing.ingredientId)
          : null;
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
      steps: normalizeSteps(meal.steps),
      ingredientsWithDetails,
      tags: tags.filter(Boolean),
    };
  },
});

// Create a new meal
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    mealTimes: v.array(v.string()),
    tagIds: v.array(v.id("tags")),
    ingredients: v.array(
      v.object({
        name: v.string(),
        ingredientId: v.optional(v.id("ingredients")),
        amount: v.optional(v.float64()),
        unit: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    steps: v.array(
      v.object({
        text: v.string(),
        timerSeconds: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    for (const ing of args.ingredients) {
      if (ing.ingredientId) {
        const ingredient = await ctx.db.get(ing.ingredientId);
        if (!ingredient || ingredient.userId !== user._id) {
          throw new Error("Invalid ingredient");
        }
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
      description: args.description,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
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
    description: v.optional(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    mealTimes: v.optional(v.array(v.string())),
    tagIds: v.optional(v.array(v.id("tags"))),
    ingredients: v.optional(
      v.array(
        v.object({
          name: v.string(),
          ingredientId: v.optional(v.id("ingredients")),
          amount: v.optional(v.float64()),
          unit: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),
    steps: v.optional(
      v.array(
        v.object({
          text: v.string(),
          timerSeconds: v.optional(v.number()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const meal = await ctx.db.get(args.id);

    if (!meal || meal.userId !== user._id) {
      throw new Error("Meal not found");
    }

    if (args.ingredients) {
      for (const ing of args.ingredients) {
        if (ing.ingredientId) {
          const ingredient = await ctx.db.get(ing.ingredientId);
          if (!ingredient || ingredient.userId !== user._id) {
            throw new Error("Invalid ingredient");
          }
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
    if (args.description !== undefined) updates.description = args.description;
    if (args.prepTime !== undefined) updates.prepTime = args.prepTime;
    if (args.cookTime !== undefined) updates.cookTime = args.cookTime;
    if (args.mealTimes !== undefined) updates.mealTimes = args.mealTimes;
    if (args.tagIds !== undefined) updates.tagIds = args.tagIds;
    if (args.ingredients !== undefined) updates.ingredients = args.ingredients;
    if (args.steps !== undefined) updates.steps = args.steps;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const getCooking = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const cooking = user.currentlyCooking;
    if (!cooking) return null;

    const meal = await ctx.db.get(cooking.mealId);
    if (!meal || meal.userId !== user._id) return null;

    return {
      mealId: cooking.mealId,
      mealName: meal.name,
      stepIndex: cooking.stepIndex,
      totalSteps: meal.steps.length,
      activeTimer: cooking.activeTimer ?? null,
    };
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
