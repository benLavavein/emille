import { v } from "convex/values";
import type { BetterAuthOptions } from "better-auth";
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";

const migrationUser = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  passwordDigest: v.optional(v.string()),
  passwordHasher: v.optional(v.string()),
  createdAt: v.number(),
});

type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function validateSecret(secret: string) {
  const expected = process.env.CLERK_MIGRATION_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Invalid migration secret");
  }
}

export const importUser = mutation({
  args: { secret: v.string(), user: migrationUser },
  handler: async (ctx, args) => {
    validateSecret(args.secret);
    if (args.user.passwordDigest && args.user.passwordHasher !== "bcrypt") {
      throw new Error(`Unsupported password hasher: ${args.user.passwordHasher}`);
    }

    const adapter = authComponent.adapter(ctx)({} as BetterAuthOptions);
    let authUser = await adapter.findOne<AuthUser>({
      model: "user",
      where: [{ field: "email", value: args.user.email }],
    });

    if (!authUser) {
      authUser = await adapter.create<AuthUser>({
        model: "user",
        data: {
          name: args.user.name,
          email: args.user.email,
          emailVerified: args.user.emailVerified,
          createdAt: new Date(args.user.createdAt),
          updatedAt: new Date(args.user.createdAt),
        },
      });
    }

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (query) => query.eq("clerkId", args.user.id))
      .unique();
    if (appUser && appUser.authId !== authUser.id) {
      await ctx.db.patch(appUser._id, { authId: authUser.id });
    }

    if (!args.user.passwordDigest) {
      return { authId: authUser.id, account: "none", appUserLinked: Boolean(appUser) };
    }

    const existingAccount = await adapter.findOne<{ id: string }>({
      model: "account",
      where: [
        { field: "accountId", value: authUser.id },
        { field: "providerId", value: "credential" },
      ],
    });

    if (!existingAccount) {
      await adapter.create({
        model: "account",
        data: {
          accountId: authUser.id,
          providerId: "credential",
          userId: authUser.id,
          password: args.user.passwordDigest,
          createdAt: new Date(args.user.createdAt),
          updatedAt: new Date(args.user.createdAt),
        },
      });
    }

    return {
      authId: authUser.id,
      account: existingAccount ? "unchanged" : "created",
      appUserLinked: Boolean(appUser),
    };
  },
});

export const reconcile = mutation({
  args: {
    secret: v.string(),
    users: v.array(
      v.object({ id: v.string(), email: v.string(), hasPassword: v.boolean() }),
    ),
  },
  handler: async (ctx, args) => {
    validateSecret(args.secret);
    const adapter = authComponent.adapter(ctx)({} as BetterAuthOptions);
    const missingUsers: string[] = [];
    const mismatchedEmails: string[] = [];
    const missingAccounts: string[] = [];
    const missingAppUsers: string[] = [];

    for (const expected of args.users) {
      const user = await adapter.findOne<{ id: string; email: string }>({
        model: "user",
        where: [{ field: "email", value: expected.email }],
      });
      if (!user) {
        missingUsers.push(expected.id);
        continue;
      }
      if (user.email !== expected.email) {
        mismatchedEmails.push(expected.id);
      }
      if (expected.hasPassword) {
        const account = await adapter.findOne<{ id: string }>({
          model: "account",
          where: [
            { field: "accountId", value: user.id },
            { field: "providerId", value: "credential" },
          ],
        });
        if (!account) {
          missingAccounts.push(expected.id);
        }
      }
      const appUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (query) => query.eq("clerkId", expected.id))
        .unique();
      if (!appUser || appUser.authId !== user.id) {
        missingAppUsers.push(expected.id);
      }
    }

    return {
      expected: args.users.length,
      valid:
        missingUsers.length === 0 &&
        mismatchedEmails.length === 0 &&
        missingAccounts.length === 0 &&
        missingAppUsers.length === 0,
      missingUsers,
      mismatchedEmails,
      missingAccounts,
      missingAppUsers,
    };
  },
});
