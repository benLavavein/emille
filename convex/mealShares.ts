import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

export const send = mutation({
  args: {
    mealId: v.id("meals"),
    toUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);

    const meal = await ctx.db.get(args.mealId);
    if (!meal || meal.userId !== me._id) {
      throw new Error("Meal not found");
    }

    const now = Date.now();
    for (const toUserId of args.toUserIds) {
      // Only send to actual friends
      const friendship = await ctx.db
        .query("friendships")
        .withIndex("by_user_and_friend", (q) =>
          q.eq("userId", me._id).eq("friendId", toUserId),
        )
        .unique();
      if (!friendship) continue;

      // Don't create duplicate pending shares
      const existing = await ctx.db
        .query("mealShares")
        .withIndex("by_from_and_to_and_meal", (q) =>
          q
            .eq("fromUserId", me._id)
            .eq("toUserId", toUserId)
            .eq("mealId", args.mealId),
        )
        .first();
      if (existing && existing.status === "pending") continue;

      await ctx.db.insert("mealShares", {
        fromUserId: me._id,
        toUserId,
        mealId: args.mealId,
        status: "pending",
        createdAt: now,
      });
    }
  },
});

export const getIncoming = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    const shares = await ctx.db
      .query("mealShares")
      .withIndex("by_to_user_and_status", (q) =>
        q.eq("toUserId", me._id).eq("status", "pending"),
      )
      .collect();

    return Promise.all(
      shares.map(async (share) => {
        const meal = await ctx.db.get(share.mealId);
        const sender = await ctx.db.get(share.fromUserId);
        return {
          shareId: share._id,
          mealId: share.mealId,
          mealName: meal?.name ?? "Unknown recipe",
          mealDeleted: !meal,
          fromName: sender?.name ?? sender?.email ?? "Someone",
          createdAt: share.createdAt,
        };
      }),
    );
  },
});

export const accept = mutation({
  args: { shareId: v.id("mealShares") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);

    const share = await ctx.db.get(args.shareId);
    if (!share || share.toUserId !== me._id || share.status !== "pending") {
      throw new Error("Share not found");
    }

    const originalMeal = await ctx.db.get(share.mealId);
    if (!originalMeal) {
      await ctx.db.patch(share._id, { status: "declined" });
      throw new Error("The original recipe no longer exists");
    }

    // Copy meal to recipient's account — no tags, no sideAttachments (those are user-specific)
    await ctx.db.insert("meals", {
      userId: me._id,
      name: originalMeal.name,
      description: originalMeal.description,
      prepTime: originalMeal.prepTime,
      cookTime: originalMeal.cookTime,
      mealTimes: originalMeal.mealTimes,
      tagIds: [],
      servings: originalMeal.servings,
      type: originalMeal.type ?? "meal",
      sideAttachments: [],
      ingredients: originalMeal.ingredients,
      steps: originalMeal.steps,
      createdAt: Date.now(),
    });

    await ctx.db.patch(share._id, { status: "accepted" });
  },
});

export const decline = mutation({
  args: { shareId: v.id("mealShares") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);

    const share = await ctx.db.get(args.shareId);
    if (!share || share.toUserId !== me._id) {
      throw new Error("Share not found");
    }

    await ctx.db.patch(share._id, { status: "declined" });
  },
});

export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    const shares = await ctx.db
      .query("mealShares")
      .withIndex("by_to_user_and_status", (q) =>
        q.eq("toUserId", me._id).eq("status", "pending"),
      )
      .collect();

    return shares.length;
  },
});
