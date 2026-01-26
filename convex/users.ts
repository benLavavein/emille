import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";

// Helper to get the current authenticated user
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // Look up the user by their Clerk ID
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

  // Look up the user by their Clerk ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) {
    // User is authenticated but not yet in our database
    // This can happen on first sign-in before upsertUser is called
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
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: identity.email || existingUser.email,
        name: identity.name || existingUser.name,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "",
      name: identity.name,
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
