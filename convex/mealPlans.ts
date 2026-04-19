import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

// Get all meal plans for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const mealPlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Fetch meal details for each plan
    const plansWithMeals = await Promise.all(
      mealPlans.map(async (plan) => {
        const meals = await Promise.all(
          plan.mealIds.map(async (mealId) => {
            const meal = await ctx.db.get(mealId);
            return meal ? { _id: meal._id, name: meal.name } : null;
          })
        );
        return {
          ...plan,
          meals: meals.filter(Boolean),
        };
      })
    );

    return plansWithMeals;
  },
});

// Get the active meal plan
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const activePlan = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .first();

    if (!activePlan) return null;

    // Fetch full meal details
    const meals = await Promise.all(
      activePlan.mealIds.map(async (mealId) => {
        const meal = await ctx.db.get(mealId);
        if (!meal) return null;

        // Get tag details
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

    return {
      ...activePlan,
      meals: meals.filter(Boolean),
    };
  },
});

// Get a single meal plan by ID
export const get = query({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      return null;
    }

    // Fetch full meal details
    const meals = await Promise.all(
      plan.mealIds.map(async (mealId) => {
        const meal = await ctx.db.get(mealId);
        if (!meal) return null;

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

    return {
      ...plan,
      meals: meals.filter(Boolean),
    };
  },
});

// Create a new meal plan
export const create = mutation({
  args: {
    name: v.string(),
    mealIds: v.array(v.id("meals")),
    setActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Verify all meals belong to this user
    for (const mealId of args.mealIds) {
      const meal = await ctx.db.get(mealId);
      if (!meal || meal.userId !== user._id) {
        throw new Error("Invalid meal");
      }
    }

    // If setting as active, deactivate other plans
    if (args.setActive) {
      const activePlans = await ctx.db
        .query("mealPlans")
        .withIndex("by_user_active", (q) =>
          q.eq("userId", user._id).eq("isActive", true)
        )
        .collect();

      for (const plan of activePlans) {
        await ctx.db.patch(plan._id, { isActive: false });
      }
    }

    return await ctx.db.insert("mealPlans", {
      userId: user._id,
      name: args.name,
      mealIds: args.mealIds,
      isActive: args.setActive ?? false,
      createdAt: Date.now(),
    });
  },
});

// Update a meal plan
export const update = mutation({
  args: {
    id: v.id("mealPlans"),
    name: v.optional(v.string()),
    mealIds: v.optional(v.array(v.id("meals"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    // Verify all meals belong to this user
    if (args.mealIds) {
      for (const mealId of args.mealIds) {
        const meal = await ctx.db.get(mealId);
        if (!meal || meal.userId !== user._id) {
          throw new Error("Invalid meal");
        }
      }
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.mealIds !== undefined) updates.mealIds = args.mealIds;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Set a meal plan as active
export const setActive = mutation({
  args: {
    id: v.id("mealPlans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    // Deactivate other plans
    const activePlans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    for (const activePlan of activePlans) {
      await ctx.db.patch(activePlan._id, { isActive: false });
    }

    // Activate this plan
    await ctx.db.patch(args.id, { isActive: true });
    return args.id;
  },
});

// Deactivate a meal plan
export const deactivate = mutation({
  args: {
    id: v.id("mealPlans"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    await ctx.db.patch(args.id, { isActive: false });
    return args.id;
  },
});

// Delete a meal plan
export const remove = mutation({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
