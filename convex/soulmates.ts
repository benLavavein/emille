import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { requireUser } from "./users";
import type { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export async function getMySoulmateRow(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  const asUser1 = await ctx.db
    .query("soulmates")
    .withIndex("by_user1", (q) => q.eq("user1Id", userId))
    .unique();
  if (asUser1) return { row: asUser1, iAmUser1: true };

  const asUser2 = await ctx.db
    .query("soulmates")
    .withIndex("by_user2", (q) => q.eq("user2Id", userId))
    .unique();
  if (asUser2) return { row: asUser2, iAmUser1: false };

  return null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMySoulmate = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const result = await getMySoulmateRow(ctx, me._id);
    if (!result) return null;

    const { row } = result;
    const partnerId = row.user1Id === me._id ? row.user2Id : row.user1Id;
    const partner = await ctx.db.get(partnerId);

    return {
      soulmateRowId: row._id,
      partnerId,
      partnerName: partner?.name ?? partner?.email ?? "Your soulmate",
      sharing: row.sharing,
      iAmUser1: row.user1Id === me._id,
    };
  },
});

export const getOutgoingRequest = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const req = await ctx.db
      .query("soulmateRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", me._id))
      .first();
    if (!req) return null;

    const to = await ctx.db.get(req.toUserId);
    return {
      requestId: req._id,
      toUserId: req.toUserId,
      toName: to?.name ?? to?.email ?? "Someone",
      proposedSharing: req.proposedSharing,
    };
  },
});

export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const requests = await ctx.db
      .query("soulmateRequests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", me._id))
      .collect();

    return Promise.all(
      requests.map(async (req) => {
        const from = await ctx.db.get(req.fromUserId);
        return {
          requestId: req._id,
          fromUserId: req.fromUserId,
          fromName: from?.name ?? from?.email ?? "Someone",
          proposedSharing: req.proposedSharing,
        };
      }),
    );
  },
});

/** Returns friends augmented with soulmate-status info for rendering the friends list. */
export const getFriendsWithSoulmateStatus = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);

    const friendRows = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const mySoulmate = await getMySoulmateRow(ctx, me._id);
    const iHaveSoulmate = !!mySoulmate;

    const outgoing = await ctx.db
      .query("soulmateRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", me._id))
      .collect();

    const incoming = await ctx.db
      .query("soulmateRequests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", me._id))
      .collect();

    return Promise.all(
      friendRows.map(async (row) => {
        const friend = await ctx.db.get(row.friendId);
        const friendSoulmate = await getMySoulmateRow(ctx, row.friendId);
        const isAlreadySoulmates =
          mySoulmate?.row.user1Id === row.friendId ||
          mySoulmate?.row.user2Id === row.friendId;
        const hasPendingRequestBetweenUs =
          outgoing.some((r) => r.toUserId === row.friendId) ||
          incoming.some((r) => r.fromUserId === row.friendId);

        return {
          friendshipId: row._id,
          friendId: row.friendId,
          name: friend?.name ?? friend?.email ?? "Unknown",
          friendCode: friend?.friendCode,
          isAlreadySoulmates,
          hasPendingRequestBetweenUs,
          // Can't request if: I have a soulmate (and it's not them), they have a soulmate (and it's not me)
          canRequestSoulmate:
            !hasPendingRequestBetweenUs &&
            !isAlreadySoulmates &&
            !iHaveSoulmate &&
            !friendSoulmate,
        };
      }),
    );
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const sendRequest = mutation({
  args: {
    toUserId: v.id("users"),
    proposedSharing: v.object({
      meals: v.boolean(),
      shoppingList: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);

    if (me._id === args.toUserId) {
      throw new Error("You can't be your own soulmate.");
    }

    // Must be friends
    const friendship = await ctx.db
      .query("friendships")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", me._id).eq("friendId", args.toUserId),
      )
      .unique();
    if (!friendship) {
      throw new Error("You must be friends first.");
    }

    // Neither can already have a soulmate
    const mySoulmate = await getMySoulmateRow(ctx, me._id);
    if (mySoulmate) throw new Error("You already have a soulmate.");

    const theirSoulmate = await getMySoulmateRow(ctx, args.toUserId);
    if (theirSoulmate) throw new Error("That person already has a soulmate.");

    // No duplicate pending request
    const existing = await ctx.db
      .query("soulmateRequests")
      .withIndex("by_from_and_to", (q) =>
        q.eq("fromUserId", me._id).eq("toUserId", args.toUserId),
      )
      .first();
    if (existing) throw new Error("Request already sent.");

    await ctx.db.insert("soulmateRequests", {
      fromUserId: me._id,
      toUserId: args.toUserId,
      status: "pending",
      proposedSharing: args.proposedSharing,
      createdAt: Date.now(),
    });
  },
});

export const acceptRequest = mutation({
  args: { requestId: v.id("soulmateRequests") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);

    if (!req || req.toUserId !== me._id) {
      throw new Error("Request not found.");
    }

    // Double-check neither has a soulmate yet
    const mySoulmate = await getMySoulmateRow(ctx, me._id);
    if (mySoulmate) throw new Error("You already have a soulmate.");

    const theirSoulmate = await getMySoulmateRow(ctx, req.fromUserId);
    if (theirSoulmate) throw new Error("Sender already has a soulmate.");

    await ctx.db.delete(req._id);
    await ctx.db.insert("soulmates", {
      user1Id: req.fromUserId,
      user2Id: me._id,
      sharing: req.proposedSharing,
      createdAt: Date.now(),
    });
  },
});

export const declineRequest = mutation({
  args: { requestId: v.id("soulmateRequests") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req || req.toUserId !== me._id) throw new Error("Request not found.");
    await ctx.db.delete(req._id);
  },
});

export const updateSharing = mutation({
  args: {
    sharing: v.object({
      meals: v.boolean(),
      shoppingList: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const result = await getMySoulmateRow(ctx, me._id);
    if (!result) throw new Error("No soulmate relationship found.");
    await ctx.db.patch(result.row._id, { sharing: args.sharing });
  },
});

export const dissolve = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const result = await getMySoulmateRow(ctx, me._id);
    if (!result) throw new Error("No soulmate relationship found.");
    await ctx.db.delete(result.row._id);
  },
});

export const cancelOutgoingRequest = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const req = await ctx.db
      .query("soulmateRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", me._id))
      .first();
    if (req) await ctx.db.delete(req._id);
  },
});
