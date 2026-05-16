import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, getCurrentUser } from "./users";

// Get all tags for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Create a new tag
export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Check if tag with same name already exists (case-insensitive)
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const existingTag = existing.find(
      (t) => t.name.toLowerCase() === args.name.trim().toLowerCase()
    );

    if (existingTag) {
      // Return existing tag instead of creating duplicate
      return existingTag._id;
    }

    return await ctx.db.insert("tags", {
      userId: user._id,
      name: args.name.trim(),
      createdAt: Date.now(),
    });
  },
});

// Delete a tag
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tag = await ctx.db.get(args.id);

    if (!tag || tag.userId !== user._id) {
      throw new Error("Tag not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
