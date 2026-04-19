import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - linked to Clerk authentication
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    defaultStoreId: v.optional(v.id("groceryStores")),
  }).index("by_clerk_id", ["clerkId"]),

  // Ingredients that the user has created/used
  ingredients: defineTable({
    userId: v.id("users"),
    name: v.string(),
    storeLocations: v.optional(
      v.array(
        v.object({
          storeId: v.id("groceryStores"),
          sectionName: v.string(),
        })
      )
    ),
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
        amount: v.optional(v.float64()),
        unit: v.optional(v.string()),
        notes: v.optional(v.string()),
      })
    ),
    steps: v.array(
      v.union(
        v.string(),
        v.object({
          text: v.string(),
          timerSeconds: v.optional(v.number()),
        })
      )
    ),
    activeTimer: v.optional(
      v.object({
        stepIndex: v.number(),
        endTime: v.number(),
      })
    ),
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

  // Meal plans - a collection of meals
  mealPlans: defineTable({
    userId: v.id("users"),
    name: v.string(),
    mealIds: v.array(v.id("meals")),
    isActive: v.boolean(), // Only one can be active at a time
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  // Shopping list for a user
  shoppingLists: defineTable({
    userId: v.id("users"),
    items: v.array(
      v.object({
        id: v.string(), // Unique ID for reordering
        name: v.string(),
        ingredientId: v.optional(v.id("ingredients")), // Link to ingredient if exists
        checked: v.boolean(),
        order: v.number(),
      })
    ),
  }).index("by_user", ["userId"]),
});
