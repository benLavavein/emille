import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { ConvexHttpClient } from "convex/browser";
import { config } from "dotenv";
import { api } from "../convex/_generated/api";

config({ path: ".env.local" });

type ClerkRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  primary_email_address: string;
  verified_email_addresses: string;
  password_digest: string;
  password_hasher: string;
  created_at: string;
};

const csvPath = process.argv[2];
const convexUrl = process.env.VITE_CONVEX_URL;
const secret = process.env.CLERK_MIGRATION_SECRET;

if (!csvPath || !convexUrl || !secret) {
  throw new Error(
    "Usage: CLERK_MIGRATION_SECRET=... npm run auth:import-clerk -- /path/to/export.csv",
  );
}

const csv = await readFile(csvPath, "utf8");
const rows = parse(csv, {
  columns: true,
  bom: true,
  skip_empty_lines: true,
  trim: true,
}) as ClerkRow[];

const users = rows.map((row) => {
  const email = row.primary_email_address.trim().toLowerCase();
  const name =
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim() ||
    row.username.trim() ||
    email.split("@")[0] ||
    "User";
  const timestamp = Number(row.created_at);
  const createdAt = Number.isFinite(timestamp)
    ? timestamp < 10_000_000_000
      ? timestamp * 1000
      : timestamp
    : Date.parse(row.created_at);

  if (!row.id || !email || !Number.isFinite(createdAt)) {
    throw new Error(`Invalid Clerk export row for user ${row.id || "unknown"}`);
  }

  return {
    id: row.id,
    name,
    email,
    emailVerified: row.verified_email_addresses.includes(
      row.primary_email_address,
    ),
    passwordDigest: row.password_digest || undefined,
    passwordHasher: row.password_hasher || undefined,
    createdAt,
  };
});

const client = new ConvexHttpClient(convexUrl);
const results = [];
for (const user of users) {
  results.push(await client.mutation(api.clerkMigration.importUser, { secret, user }));
}

const reconciliation = await client.mutation(api.clerkMigration.reconcile, {
  secret,
  users: users.map((user) => ({
    id: user.id,
    email: user.email,
    hasPassword: Boolean(user.passwordDigest),
  })),
});

const createdAccounts = results.filter(
  (result) => result.account === "created",
).length;

console.log(
  JSON.stringify(
    {
      imported: users.length,
      createdAccounts,
      linkedAppUsers: results.filter((result) => result.appUserLinked).length,
      reconciliation,
    },
    null,
    2,
  ),
);
