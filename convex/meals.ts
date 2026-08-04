import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, getCurrentUser } from "./users";
import { getMySoulmateRow } from "./soulmates";

type Step = { text: string; timerSeconds?: number };

function normalizeSteps(steps: (string | Step)[]): Step[] {
  return steps.map((s) => (typeof s === "string" ? { text: s } : s));
}

// Get all meals for the current user with tag details (+ soulmate meals if sharing enabled)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

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
          type: meal.type ?? "meal",
          steps: normalizeSteps(meal.steps),
          tags: tags.filter(Boolean),
          isFromSoulmate: false as boolean,
          soulmateOwnerName: null as string | null,
        };
      })
    );

    // Append soulmate's meals if sharing is enabled
    const soulmateResult = await getMySoulmateRow(ctx, user._id);
    if (soulmateResult && soulmateResult.row.sharing.meals) {
      const partnerId =
        soulmateResult.row.user1Id === user._id
          ? soulmateResult.row.user2Id
          : soulmateResult.row.user1Id;
      const partner = await ctx.db.get(partnerId);
      const partnerName = partner?.name ?? partner?.email ?? "Your soulmate";

      const partnerMeals = await ctx.db
        .query("meals")
        .withIndex("by_user", (q) => q.eq("userId", partnerId))
        .order("desc")
        .collect();

      const partnerMealsWithTags = await Promise.all(
        partnerMeals.map(async (meal) => {
          const tags = await Promise.all(
            (meal.tagIds || []).map(async (tagId) => {
              const tag = await ctx.db.get(tagId);
              return tag ? { _id: tag._id, name: tag.name } : null;
            })
          );
          return {
            ...meal,
            type: meal.type ?? "meal",
            steps: normalizeSteps(meal.steps),
            tags: tags.filter(Boolean),
            isFromSoulmate: true as boolean,
            soulmateOwnerName: partnerName as string | null,
          };
        })
      );

      return [...mealsWithTags, ...partnerMealsWithTags];
    }

    return mealsWithTags;
  },
});

// Get only side dishes for the current user (for pickers)
export const listSides = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return meals
      .filter((m) => m.type === "side")
      .map((m) => ({ _id: m._id, name: m.name, cookTime: m.cookTime }));
  },
});

// Get a single meal by ID with ingredient, tag, and side details
export const get = query({
  args: { id: v.id("meals") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const meal = await ctx.db.get(args.id);
    if (!meal) return null;

    let isFromSoulmate = false;
    let soulmateOwnerName: string | null = null;

    if (meal.userId !== user._id) {
      // Check if this meal belongs to our soulmate and meals sharing is on
      const soulmateResult = await getMySoulmateRow(ctx, user._id);
      if (!soulmateResult || !soulmateResult.row.sharing.meals) return null;
      const partnerId =
        soulmateResult.row.user1Id === user._id
          ? soulmateResult.row.user2Id
          : soulmateResult.row.user1Id;
      if (meal.userId !== partnerId) return null;
      isFromSoulmate = true;
      const partner = await ctx.db.get(partnerId);
      soulmateOwnerName = partner?.name ?? partner?.email ?? "Your soulmate";
    }

    const tags = await Promise.all(
      (meal.tagIds || []).map(async (tagId) => {
        const tag = await ctx.db.get(tagId);
        return tag ? { _id: tag._id, name: tag.name } : null;
      })
    );

    const sideAttachments = await Promise.all(
      (meal.sideAttachments ?? []).map(async (att) => {
        const side = await ctx.db.get(att.sideId);
        if (!side || side.userId !== user._id) return null;
        return {
          sideId: att.sideId,
          alwaysInclude: att.alwaysInclude,
          name: side.name,
          cookTime: side.cookTime,
        };
      })
    );

    return {
      ...meal,
      type: meal.type ?? "meal",
      steps: normalizeSteps(meal.steps),
      tags: tags.filter(Boolean),
      sideAttachments: sideAttachments.filter(Boolean),
      isFromSoulmate,
      soulmateOwnerName,
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
    servings: v.optional(v.number()),
    mealTimes: v.array(v.string()),
    tagIds: v.array(v.id("tags")),
    type: v.optional(v.union(v.literal("meal"), v.literal("side"))),
    sideAttachments: v.optional(
      v.array(
        v.object({
          sideId: v.id("meals"),
          alwaysInclude: v.boolean(),
        })
      )
    ),
    ingredients: v.array(
      v.object({
        name: v.string(),
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

    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (!tag || tag.userId !== user._id) {
        throw new Error("Invalid tag");
      }
    }

    for (const att of args.sideAttachments ?? []) {
      const side = await ctx.db.get(att.sideId);
      if (!side || side.userId !== user._id) {
        throw new Error("Invalid side dish");
      }
    }

    return await ctx.db.insert("meals", {
      userId: user._id,
      name: args.name,
      description: args.description,
      prepTime: args.prepTime,
      cookTime: args.cookTime,
      servings: args.servings,
      mealTimes: args.mealTimes,
      tagIds: args.tagIds,
      type: args.type ?? "meal",
      sideAttachments: args.sideAttachments ?? [],
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
    servings: v.optional(v.number()),
    mealTimes: v.optional(v.array(v.string())),
    tagIds: v.optional(v.array(v.id("tags"))),
    type: v.optional(v.union(v.literal("meal"), v.literal("side"))),
    sideAttachments: v.optional(
      v.array(
        v.object({
          sideId: v.id("meals"),
          alwaysInclude: v.boolean(),
        })
      )
    ),
    ingredients: v.optional(
      v.array(
        v.object({
          name: v.string(),
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

    if (args.tagIds) {
      for (const tagId of args.tagIds) {
        const tag = await ctx.db.get(tagId);
        if (!tag || tag.userId !== user._id) {
          throw new Error("Invalid tag");
        }
      }
    }

    if (args.sideAttachments) {
      for (const att of args.sideAttachments) {
        const side = await ctx.db.get(att.sideId);
        if (!side || side.userId !== user._id) {
          throw new Error("Invalid side dish");
        }
      }
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.prepTime !== undefined) updates.prepTime = args.prepTime;
    if (args.cookTime !== undefined) updates.cookTime = args.cookTime;
    if (args.servings !== undefined) updates.servings = args.servings;
    if (args.mealTimes !== undefined) updates.mealTimes = args.mealTimes;
    if (args.tagIds !== undefined) updates.tagIds = args.tagIds;
    if (args.type !== undefined) updates.type = args.type;
    if (args.sideAttachments !== undefined) updates.sideAttachments = args.sideAttachments;
    if (args.ingredients !== undefined) updates.ingredients = args.ingredients;
    if (args.steps !== undefined) updates.steps = args.steps;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const getCooking = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const sessions = user.currentlyCooking;
    if (!sessions || sessions.length === 0) return [];

    const results = await Promise.all(
      sessions.map(async (session) => {
        const meal = await ctx.db.get(session.mealId);
        if (!meal || meal.userId !== user._id) return null;
        return {
          mealId: session.mealId,
          mealName: meal.name,
          mealType: meal.type ?? "meal",
          stepIndex: session.stepIndex,
          totalSteps: meal.steps.length,
          activeTimer: session.activeTimer ?? null,
        };
      })
    );

    return results.filter(
      (session): session is NonNullable<typeof session> => session !== null,
    );
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
