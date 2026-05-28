import { v, ConvexError } from "convex/values";
import { customAlphabet } from "nanoid";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireUser } from "./users";

const FRIEND_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FRIEND_CODE_LENGTH = 8;
const generateCode = customAlphabet(FRIEND_CODE_ALPHABET, FRIEND_CODE_LENGTH);

/** Generate a friend code that is guaranteed unique in the DB. */
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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMyFriendCode = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return user.friendCode;
  },
});

export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", user._id))
      .collect();

    return Promise.all(
      requests.map(async (req) => {
        const sender = await ctx.db.get(req.fromUserId);
        return {
          requestId: req._id,
          fromUserId: req.fromUserId,
          fromName: sender?.name ?? sender?.email ?? "Unknown",
          fromFriendCode: sender?.friendCode,
        };
      }),
    );
  },
});

export const getFriends = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return Promise.all(
      rows.map(async (row) => {
        const friend = await ctx.db.get(row.friendId);
        return {
          friendshipId: row._id,
          friendId: row.friendId,
          name: friend?.name ?? friend?.email ?? "Unknown",
          friendCode: friend?.friendCode,
        };
      }),
    );
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const sendFriendRequest = mutation({
  args: { friendCode: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);

    const code = args.friendCode.trim().toUpperCase();

    const target = await ctx.db
      .query("users")
      .withIndex("by_friend_code", (q) => q.eq("friendCode", code))
      .unique();

    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    if (target._id === me._id) {
      throw new ConvexError({ code: "SELF_ADD" });
    }

    // Already friends?
    const alreadyFriends = await ctx.db
      .query("friendships")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", me._id).eq("friendId", target._id),
      )
      .unique();
    if (alreadyFriends) {
      return { result: "already_friends" as const };
    }

    // Pending request from me to them?
    const existingOutgoing = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_and_to", (q) =>
        q.eq("fromUserId", me._id).eq("toUserId", target._id),
      )
      .unique();
    if (existingOutgoing) {
      return { result: "already_requested" as const };
    }

    // They already sent me a request? Auto-accept.
    const incomingFromThem = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_and_to", (q) =>
        q.eq("fromUserId", target._id).eq("toUserId", me._id),
      )
      .unique();
    if (incomingFromThem) {
      await ctx.db.delete(incomingFromThem._id);
      const now = Date.now();
      await ctx.db.insert("friendships", {
        userId: me._id,
        friendId: target._id,
        createdAt: now,
      });
      await ctx.db.insert("friendships", {
        userId: target._id,
        friendId: me._id,
        createdAt: now,
      });
      return { result: "accepted" as const };
    }

    await ctx.db.insert("friendRequests", {
      fromUserId: me._id,
      toUserId: target._id,
      status: "pending",
    });
    return { result: "requested" as const };
  },
});

export const acceptFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.toUserId !== me._id) {
      throw new Error("Friend request not found.");
    }

    await ctx.db.delete(request._id);
    const now = Date.now();
    await ctx.db.insert("friendships", {
      userId: me._id,
      friendId: request.fromUserId,
      createdAt: now,
    });
    await ctx.db.insert("friendships", {
      userId: request.fromUserId,
      friendId: me._id,
      createdAt: now,
    });
  },
});

export const declineFriendRequest = mutation({
  args: { requestId: v.id("friendRequests") },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.toUserId !== me._id) {
      throw new Error("Friend request not found.");
    }
    await ctx.db.delete(request._id);
  },
});
