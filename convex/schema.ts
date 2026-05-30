import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - linked to Clerk authentication
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    friendCode: v.string(),
    defaultStoreId: v.optional(v.id("groceryStores")),
    activeMealPlanId: v.optional(v.id("mealPlans")),
    currentlyCooking: v.optional(
      v.union(
        // New shape: array of sessions
        v.array(
          v.object({
            mealId: v.id("meals"),
            stepIndex: v.number(),
            activeTimer: v.optional(
              v.object({
                stepIndex: v.number(),
                endTime: v.number(),
              })
            ),
          })
        ),
        // Legacy shape: single object — kept temporarily for migration
        v.object({
          mealId: v.id("meals"),
          stepIndex: v.number(),
          activeTimer: v.optional(
            v.object({
              stepIndex: v.number(),
              endTime: v.number(),
            })
          ),
        })
      )
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_friend_code", ["friendCode"]),

  // Friend requests between users
  friendRequests: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    // Only "pending" requests are stored; accepted → friendship row; declined → deleted
    status: v.literal("pending"),
  })
    .index("by_to_user", ["toUserId"])
    .index("by_from_user", ["fromUserId"])
    .index("by_from_and_to", ["fromUserId", "toUserId"]),

  // Accepted friendships – two symmetric rows per friendship for easy querying
  friendships: defineTable({
    userId: v.id("users"),
    friendId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_friend", ["userId", "friendId"]),

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
    description: v.optional(v.string()),
    prepTime: v.optional(v.number()),
    cookTime: v.optional(v.number()),
    mealTimes: v.array(v.string()), // ["breakfast", "lunch", "dinner"]
    tagIds: v.array(v.id("tags")), // Tags for this meal
    servings: v.optional(v.number()),
    type: v.optional(v.union(v.literal("meal"), v.literal("side"))),
    sideAttachments: v.optional(
      v.array(
        v.object({
          sideId: v.id("meals"),
          alwaysInclude: v.boolean(),
        })
      )
    ),
    ingredients: v.array(
      v.object({
        name: v.string(),
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

  // Meal plans — history snapshots; active plan is users.activeMealPlanId
  mealPlans: defineTable({
    userId: v.id("users"),
    breakfastMealIds: v.array(v.id("meals")),
    lunchMealIds: v.array(v.id("meals")),
    dinnerMealIds: v.array(v.id("meals")),
    cookedMealIds: v.array(v.id("meals")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Shopping list for a user
  shoppingLists: defineTable({
    userId: v.id("users"),
    items: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        amount: v.optional(v.float64()),
        unit: v.optional(v.string()),
        notes: v.optional(v.string()),
        mealName: v.optional(v.string()),
        checked: v.boolean(),
        order: v.number(),
      })
    ),
  }).index("by_user", ["userId"]),
});
