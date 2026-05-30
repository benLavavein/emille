import { v } from "convex/values";
import { customAlphabet } from "nanoid";
import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";

const FRIEND_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateCode = customAlphabet(FRIEND_CODE_ALPHABET, 8);

async function generateUniqueFriendCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_friend_code", (q) => q.eq("friendCode", code))
      .unique();
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique friend code after 10 attempts");
}

// Helper to get the current authenticated user
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  return user;
}

// Helper to get or throw if user not found
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found - please refresh the page");
  }

  return user;
}

// Create or update user when they sign in
export const upsertUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: identity.email || existingUser.email,
        name: identity.name || existingUser.name,
      });
      return existingUser._id;
    }

    const friendCode = await generateUniqueFriendCode(ctx);
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "",
      name: identity.name,
      friendCode,
    });

    return userId;
  },
});

// Get the current user's data
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

// Start cooking a single meal, preserving any existing sessions
export const setCooking = mutation({
  args: {
    mealId: v.id("meals"),
    stepIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== user._id) {
      throw new Error("Meal not found");
    }

    const sessions = user.currentlyCooking ?? [];
    const existing = sessions.find((s) => s.mealId === args.mealId);

    const updated = existing
      ? sessions.map((s) =>
          s.mealId === args.mealId
            ? { ...s, stepIndex: args.stepIndex }
            : s
        )
      : [...sessions, { mealId: args.mealId, stepIndex: args.stepIndex }];

    await ctx.db.patch(user._id, { currentlyCooking: updated });
  },
});

// Start cooking multiple meals, merging with any existing sessions
export const startCookingMany = mutation({
  args: {
    mealIds: v.array(v.id("meals")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    for (const mealId of args.mealIds) {
      const meal = await ctx.db.get(mealId);
      if (!meal || meal.userId !== user._id) {
        throw new Error(`Meal not found: ${mealId}`);
      }
    }

    const existing = user.currentlyCooking ?? [];
    const existingIds = new Set(existing.map((s) => s.mealId));

    const newSessions = args.mealIds
      .filter((id) => !existingIds.has(id))
      .map((mealId) => ({ mealId, stepIndex: -1 }));

    await ctx.db.patch(user._id, {
      currentlyCooking: [...existing, ...newSessions],
    });
  },
});

// Remove one meal from cooking sessions (marks it as cooked in the meal plan)
export const clearOneCooking = mutation({
  args: { mealId: v.id("meals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (user.activeMealPlanId) {
      const plan = await ctx.db.get(user.activeMealPlanId);
      if (plan && plan.userId === user._id) {
        const inPlan = [
          ...plan.breakfastMealIds,
          ...plan.lunchMealIds,
          ...plan.dinnerMealIds,
        ].some((id) => id === args.mealId);
        if (inPlan) {
          const cooked = plan.cookedMealIds ?? [];
          if (!cooked.includes(args.mealId)) {
            await ctx.db.patch(plan._id, {
              cookedMealIds: [...cooked, args.mealId],
            });
          }
        }
      }
    }

    const sessions = (user.currentlyCooking ?? []).filter(
      (s) => s.mealId !== args.mealId
    );
    await ctx.db.patch(user._id, {
      currentlyCooking: sessions.length > 0 ? sessions : undefined,
    });
  },
});

// Clear all cooking sessions
export const clearCooking = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { currentlyCooking: undefined });
  },
});

export const startTimer = mutation({
  args: {
    mealId: v.id("meals"),
    stepIndex: v.number(),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const sessions = user.currentlyCooking ?? [];
    const session = sessions.find((s) => s.mealId === args.mealId);
    if (!session) throw new Error("Not currently cooking this meal");

    const updated = sessions.map((s) =>
      s.mealId === args.mealId
        ? {
            ...s,
            activeTimer: {
              stepIndex: args.stepIndex,
              endTime: Date.now() + args.durationSeconds * 1000,
            },
          }
        : s
    );

    await ctx.db.patch(user._id, { currentlyCooking: updated });
  },
});

export const clearTimer = mutation({
  args: { mealId: v.id("meals") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const sessions = user.currentlyCooking ?? [];

    const updated = sessions.map((s) =>
      s.mealId === args.mealId ? { ...s, activeTimer: undefined } : s
    );

    await ctx.db.patch(user._id, { currentlyCooking: updated });
  },
});

// Set the user's default store
export const setDefaultStore = mutation({
  args: {
    storeId: v.optional(v.id("groceryStores")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.storeId) {
      const store = await ctx.db.get(args.storeId);
      if (!store || store.userId !== user._id) {
        throw new Error("Store not found");
      }
    }

    await ctx.db.patch(user._id, {
      defaultStoreId: args.storeId,
    });

    return user._id;
  },
});
