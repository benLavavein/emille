import { useEffect, useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Analytics } from "@vercel/analytics/react";

import type { Route } from "./+types/root";
import "./app.css";
import { clerkMiddleware, rootAuthLoader } from "@clerk/react-router/server";
import {
  ClerkLoaded,
  ClerkLoading,
  ClerkProvider,
  SignIn,
  SignUp,
  useAuth,
} from "@clerk/react-router";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import {
  Authenticated,
  AuthLoading,
  ConvexReactClient,
  Unauthenticated,
  useMutation,
  useConvexAuth,
} from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { api } from "../convex/_generated/api";
import { AppHeader, DesktopSidebar } from "./components/app-header";
import { BackButtonProvider } from "./lib/back-button";
import { OtterIcon } from "./components/icons/otter";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

// Component that syncs the Clerk user to Convex
function UserSync() {
  const { isAuthenticated } = useConvexAuth();
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (isAuthenticated) {
      upsertUser().catch(console.error);
    }
  }, [isAuthenticated, upsertUser]);

  return null;
}

export const middleware = [clerkMiddleware()];

export const loader = (args: Route.LoaderArgs) => rootAuthLoader(args);

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Geom:wght@400;500;600;700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#574964" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Emille" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/otter-192.png" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                  navigator.serviceWorker.register("/sw.js");
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

const clerkAppearance = {
  variables: { colorPrimary: "#574964" },
  elements: {
    header: { display: "none" } as React.CSSProperties,
    card: {
      boxShadow: "none",
      border: "none",
      backgroundColor: "transparent",
    } as React.CSSProperties,
    cardBox: {
      boxShadow: "none",
      border: "none",
      backgroundColor: "transparent",
    } as React.CSSProperties,
    footer: { display: "none" } as React.CSSProperties,
    socialButtonsBlockButton: {
      backgroundColor: "white",
      border: "1px solid #e5e5e5",
    } as React.CSSProperties,
  },
};

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <OtterIcon className="w-40 h-40 mx-auto mb-4 text-plum" />
      <h1 className="text-4xl font-bold text-plum mb-4">Emille</h1>
      <p className="text-mauve mb-6">
        {mode === "signin"
          ? "Sign in to manage your meals"
          : "Create your account"}
      </p>
      <ClerkLoading>
        <div className="animate-pulse space-y-8 px-6 py-15 h-50 max-w-[370px] w-full">
          <div className="h-7 rounded-md bg-plum/8" />
          <div className="h-7 rounded-md bg-plum/8" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <div className="h-50">
          {mode === "signin" ? (
            <SignIn routing="hash" appearance={clerkAppearance} />
          ) : (
            <SignUp routing="hash" appearance={clerkAppearance} />
          )}
        </div>
      </ClerkLoaded>
      <p className="text-sm text-mauve mt-2">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              onClick={() => setMode("signup")}
              className="font-medium text-plum hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setMode("signin")}
              className="font-medium text-plum hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider loaderData={loaderData}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <QueryClientProvider client={queryClient}>
          <main>
            <AuthLoading>
              <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-6">
                  <OtterIcon className="w-24 h-24 text-plum" />
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-plum/30 border-t-plum" />
                </div>
              </div>
            </AuthLoading>
            <Unauthenticated>
              <AuthScreen />
            </Unauthenticated>
            <Authenticated>
              <UserSync />
              <BackButtonProvider>
                <div className="flex h-screen min-h-0 flex-col overflow-hidden">
                  <div className="h-15 shrink-0 md:hidden">
                    <AppHeader />
                  </div>
                  <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
                    <DesktopSidebar />
                    <div className="min-h-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
                      <Outlet />
                    </div>
                  </div>
                </div>
              </BackButtonProvider>
            </Authenticated>
          </main>
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
