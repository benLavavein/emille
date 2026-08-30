import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

const convexSiteUrl =
  import.meta.env.VITE_CONVEX_SITE_URL ||
  (import.meta.env.VITE_CONVEX_URL as string).replace(
    ".convex.cloud",
    ".convex.site",
  );

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient(), crossDomainClient()],
});
