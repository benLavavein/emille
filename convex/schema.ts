import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - linked to Clerk authentication
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  // Ingredients that the user has created/used
  ingredients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    storeId: v.optional(v.id("groceryStores")), // Which store this ingredient is typically at
    storeSectionName: v.optional(v.string()), // Which section in that store
    defaultQuantityType: v.optional(v.string()), // Default unit: "cup", "tablespoon", etc.
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  // Tags for categorizing meals
  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  // Meals with ingredients and recipe steps
  meals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    mealTimes: v.array(v.string()), // ["breakfast", "lunch", "dinner"]
    tagIds: v.array(v.id("tags")), // Tags for this meal
    ingredients: v.array(
      v.object({
        ingredientId: v.id("ingredients"),
        quantity: v.optional(v.string()), // e.g., "2 cups", "1 lb"
        notes: v.optional(v.string()), // e.g., "diced", "room temperature"
      })
    ),
    steps: v.array(v.string()), // Recipe steps in order
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  // Grocery stores with sections and preferred shopping order
  groceryStores: defineTable({
    userId: v.id("users"),
    name: v.string(),
    sections: v.array(
      v.object({
        name: v.string(), // e.g., "Produce", "Dairy", "Frozen"
        order: v.number(), // The order you visit this section (1, 2, 3, etc.)
      })
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),
});
