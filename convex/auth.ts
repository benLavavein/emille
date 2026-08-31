import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { compare, hash } from "bcryptjs";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    session: {
      expiresIn: 60 * 60 * 24 * 365,
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, url }) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          throw new Error("RESEND_API_KEY is not configured");
        }

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from:
              process.env.AUTH_EMAIL_FROM ||
              "Emille <account@auth.emille.app>",
            to: user.email,
            subject: "Reset your Emille password",
            html: `<p>Use the link below to reset your Emille password.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resend failed with status ${response.status}`);
        }
      },
      password: {
        hash: (password) => hash(password, 10),
        verify: ({ hash: passwordHash, password }) =>
          compare(password, passwordHash),
      },
    },
    plugins: [crossDomain({ siteUrl }), convex({ authConfig })],
  });
