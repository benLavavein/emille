import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUser, getCurrentUser } from "./users";

async function mealWithTags(ctx: QueryCtx, mealId: Id<"meals">) {
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
}

async function resolveSlot(
  ctx: QueryCtx,
  mealIds: Id<"meals">[]
): Promise<Array<NonNullable<Awaited<ReturnType<typeof mealWithTags>>>>> {
  const out: Array<NonNullable<Awaited<ReturnType<typeof mealWithTags>>>> = [];
  for (const mealId of mealIds) {
    const m = await mealWithTags(ctx, mealId);
    if (m) out.push(m);
  }
  return out;
}

function pruneCookedToPlan(
  plan: Doc<"mealPlans">,
  breakfast: Id<"meals">[],
  lunch: Id<"meals">[],
  dinner: Id<"meals">[]
): Id<"meals">[] {
  const allowed = new Set([...breakfast, ...lunch, ...dinner]);
  return (plan.cookedMealIds ?? []).filter((id) => allowed.has(id));
}

async function validateMealOwnership(
  ctx: MutationCtx,
  userId: Id<"users">,
  mealIds: Id<"meals">[]
) {
  for (const mealId of mealIds) {
    const meal = await ctx.db.get(mealId);
    if (!meal || meal.userId !== userId) {
      throw new Error("Invalid meal");
    }
  }
}

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (!user.activeMealPlanId) return null;

    const activePlan = await ctx.db.get(user.activeMealPlanId);
    if (!activePlan || activePlan.userId !== user._id) {
      return null;
    }

    const [breakfastMeals, lunchMeals, dinnerMeals] = await Promise.all([
      resolveSlot(ctx, activePlan.breakfastMealIds),
      resolveSlot(ctx, activePlan.lunchMealIds),
      resolveSlot(ctx, activePlan.dinnerMealIds),
    ]);

    return {
      ...activePlan,
      breakfastMeals,
      lunchMeals,
      dinnerMeals,
    };
  },
});

export const get = query({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      return null;
    }

    const [breakfastMeals, lunchMeals, dinnerMeals] = await Promise.all([
      resolveSlot(ctx, plan.breakfastMealIds),
      resolveSlot(ctx, plan.lunchMealIds),
      resolveSlot(ctx, plan.dinnerMealIds),
    ]);

    return {
      ...plan,
      breakfastMeals,
      lunchMeals,
      dinnerMeals,
    };
  },
});

export const ensureActiveMealPlan = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.activeMealPlanId) {
      const existing = await ctx.db.get(user.activeMealPlanId);
      if (existing && existing.userId === user._id) {
        return user.activeMealPlanId;
      }
    }

    const id = await ctx.db.insert("mealPlans", {
      userId: user._id,
      breakfastMealIds: [],
      lunchMealIds: [],
      dinnerMealIds: [],
      cookedMealIds: [],
      createdAt: Date.now(),
    });
    await ctx.db.patch(user._id, { activeMealPlanId: id });
    return id;
  },
});

export const create = mutation({
  args: {
    breakfastMealIds: v.array(v.id("meals")),
    lunchMealIds: v.array(v.id("meals")),
    dinnerMealIds: v.array(v.id("meals")),
    setActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    await validateMealOwnership(ctx, user._id, args.breakfastMealIds);
    await validateMealOwnership(ctx, user._id, args.lunchMealIds);
    await validateMealOwnership(ctx, user._id, args.dinnerMealIds);

    const id = await ctx.db.insert("mealPlans", {
      userId: user._id,
      breakfastMealIds: args.breakfastMealIds,
      lunchMealIds: args.lunchMealIds,
      dinnerMealIds: args.dinnerMealIds,
      cookedMealIds: [],
      createdAt: Date.now(),
    });

    if (args.setActive) {
      await ctx.db.patch(user._id, { activeMealPlanId: id });
    }

    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("mealPlans"),
    breakfastMealIds: v.optional(v.array(v.id("meals"))),
    lunchMealIds: v.optional(v.array(v.id("meals"))),
    dinnerMealIds: v.optional(v.array(v.id("meals"))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    const breakfast = args.breakfastMealIds ?? plan.breakfastMealIds;
    const lunch = args.lunchMealIds ?? plan.lunchMealIds;
    const dinner = args.dinnerMealIds ?? plan.dinnerMealIds;

    await validateMealOwnership(ctx, user._id, breakfast);
    await validateMealOwnership(ctx, user._id, lunch);
    await validateMealOwnership(ctx, user._id, dinner);

    const cookedMealIds = pruneCookedToPlan(plan, breakfast, lunch, dinner);

    await ctx.db.patch(args.id, {
      breakfastMealIds: breakfast,
      lunchMealIds: lunch,
      dinnerMealIds: dinner,
      cookedMealIds,
    });
    return args.id;
  },
});

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

    await ctx.db.patch(user._id, { activeMealPlanId: args.id });
    return args.id;
  },
});

export const deactivate = mutation({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    if (user.activeMealPlanId === args.id) {
      await ctx.db.patch(user._id, { activeMealPlanId: undefined });
    }
    return args.id;
  },
});

export const remove = mutation({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(args.id);

    if (!plan || plan.userId !== user._id) {
      throw new Error("Meal plan not found");
    }

    if (user.activeMealPlanId === args.id) {
      await ctx.db.patch(user._id, { activeMealPlanId: undefined });
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
