import { v } from "convex/values";
import { customAlphabet } from "nanoid";
import {
  mutation,
  query,
  internalMutation,
  MutationCtx,
} from "./_generated/server";
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
// Backfill migration – call once from the Convex dashboard to assign codes to
// all existing users who don't have one yet.
// ---------------------------------------------------------------------------
export const backfillFriendCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    for (const user of users) {
      if (!user.friendCode) {
        const code = await generateUniqueFriendCode(ctx);
        await ctx.db.patch(user._id, { friendCode: code });
        updated++;
      }
    }
    return { updated };
  },
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMyFriendCode = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return user.friendCode ?? null;
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
          fromFriendCode: sender?.friendCode ?? null,
        };
      })
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
          friendCode: friend?.friendCode ?? null,
        };
      })
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
      throw new Error("No user found with that friend code.");
    }
    if (target._id === me._id) {
      throw new Error("You can't add yourself as a friend.");
    }

    // Already friends?
    const alreadyFriends = await ctx.db
      .query("friendships")
      .withIndex("by_user_and_friend", (q) =>
        q.eq("userId", me._id).eq("friendId", target._id)
      )
      .unique();
    if (alreadyFriends) {
      throw new Error("You are already friends with this user.");
    }

    // Pending request from me to them?
    const existingOutgoing = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_and_to", (q) =>
        q.eq("fromUserId", me._id).eq("toUserId", target._id)
      )
      .unique();
    if (existingOutgoing) {
      throw new Error("You already sent a request to this user.");
    }

    // They already sent me a request? Auto-accept.
    const incomingFromThem = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_and_to", (q) =>
        q.eq("fromUserId", target._id).eq("toUserId", me._id)
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
