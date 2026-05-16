import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

// Get all grocery stores for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    return await ctx.db
      .query("groceryStores")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Get a single grocery store by ID
export const get = query({
  args: { id: v.id("groceryStores") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const store = await ctx.db.get(args.id);

    if (!store || store.userId !== user._id) {
      return null;
    }

    // Return with sections sorted by order
    return {
      ...store,
      sections: [...store.sections].sort((a, b) => a.order - b.order),
    };
  },
});

// Create a new grocery store
export const create = mutation({
  args: {
    name: v.string(),
    sections: v.array(
      v.object({
        name: v.string(),
        order: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    return await ctx.db.insert("groceryStores", {
      userId: user._id,
      name: args.name,
      sections: args.sections,
      createdAt: Date.now(),
    });
  },
});

// Update a grocery store
export const update = mutation({
  args: {
    id: v.id("groceryStores"),
    name: v.optional(v.string()),
    sections: v.optional(
      v.array(
        v.object({
          name: v.string(),
          order: v.number(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const store = await ctx.db.get(args.id);

    if (!store || store.userId !== user._id) {
      throw new Error("Grocery store not found");
    }

    const updates: Partial<{
      name: string;
      sections: typeof args.sections;
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.sections !== undefined) updates.sections = args.sections;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Add a section to a grocery store
export const addSection = mutation({
  args: {
    storeId: v.id("groceryStores"),
    name: v.string(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const store = await ctx.db.get(args.storeId);

    if (!store || store.userId !== user._id) {
      throw new Error("Grocery store not found");
    }

    // Default order is at the end
    const order = args.order ?? store.sections.length + 1;

    await ctx.db.patch(args.storeId, {
      sections: [...store.sections, { name: args.name, order }],
    });

    return args.storeId;
  },
});

// Remove a section from a grocery store
export const removeSection = mutation({
  args: {
    storeId: v.id("groceryStores"),
    sectionName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const store = await ctx.db.get(args.storeId);

    if (!store || store.userId !== user._id) {
      throw new Error("Grocery store not found");
    }

    await ctx.db.patch(args.storeId, {
      sections: store.sections.filter((s) => s.name !== args.sectionName),
    });

    return args.storeId;
  },
});

// Reorder sections in a grocery store
export const reorderSections = mutation({
  args: {
    storeId: v.id("groceryStores"),
    sectionOrder: v.array(v.string()), // Array of section names in new order
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const store = await ctx.db.get(args.storeId);

    if (!store || store.userId !== user._id) {
      throw new Error("Grocery store not found");
    }

    // Create new sections array with updated order
    const updatedSections = args.sectionOrder.map((name, index) => {
      const existing = store.sections.find((s) => s.name === name);
      if (!existing) {
        throw new Error(`Section "${name}" not found`);
      }
      return { name, order: index + 1 };
    });

    await ctx.db.patch(args.storeId, {
      sections: updatedSections,
    });

    return args.storeId;
  },
});

// Delete a grocery store
export const remove = mutation({
  args: { id: v.id("groceryStores") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const store = await ctx.db.get(args.id);

    if (!store || store.userId !== user._id) {
      throw new Error("Grocery store not found");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

