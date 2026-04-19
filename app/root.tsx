import { useEffect } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { clerkMiddleware, rootAuthLoader } from '@clerk/react-router/server'
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/react-router";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Authenticated, ConvexReactClient, Unauthenticated, useMutation, useConvexAuth } from "convex/react";
import { api } from "../convex/_generated/api";
import { AppHeader } from "./components/app-header";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

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


export const middleware = [clerkMiddleware()]

export const loader = (args: Route.LoaderArgs) => rootAuthLoader(args)


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
        <link rel="apple-touch-icon" href="/otter.svg" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
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

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider loaderData={loaderData}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <main>
          <Unauthenticated>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-plum mb-4">Emille</h1>
                <p className="text-mauve mb-6">Sign in to manage your meals</p>
                <SignInButton>
                  <button className="px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
          </Unauthenticated>
          <Authenticated>
            <UserSync />
            <AppHeader />
            <Outlet />
          </Authenticated>
        </main>
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
