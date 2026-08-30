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
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
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
import { authClient } from "./lib/auth-client";
import { OtterIcon } from "./components/icons/otter";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
  expectAuth: true,
});
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

function AuthScreen() {
  const [mode, setMode] = useState<
    "signin" | "signup" | "forgot" | "reset"
  >("signin");
  const [resetToken, setResetToken] = useState<string>();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);
    setIsSubmitting(true);

    try {
      if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/?resetPassword=1`,
        });
        if (result.error) {
          setError(result.error.message || "Could not request a reset link");
        } else {
          setMessage("If that email exists, a reset link is on its way.");
        }
        return;
      }

      if (mode === "reset") {
        const result = await authClient.resetPassword({
          newPassword: password,
          token: resetToken || "",
        });
        if (result.error) {
          setError(result.error.message || "Could not reset your password");
        } else {
          window.history.replaceState({}, "", "/");
          setMode("signin");
          setPassword("");
          setMessage("Password updated. You can sign in now.");
        }
        return;
      }

      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message || "Authentication failed");
      }
    } catch {
      setError("Could not reach the authentication service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <OtterIcon className="w-40 h-40 mx-auto mb-4 text-plum" />
      <h1 className="text-4xl font-bold text-plum mb-4">Emille</h1>
      <p className="text-mauve mb-6">
        {mode === "signin" && "Sign in to manage your meals"}
        {mode === "signup" && "Create your account"}
        {mode === "forgot" && "Request a password reset link"}
        {mode === "reset" && "Choose a new password"}
      </p>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 px-6">
        {mode === "signup" && (
          <label className="block space-y-1.5 text-sm font-medium text-plum">
            Name
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-plum/20 bg-white px-3 py-2.5 outline-none focus:border-plum"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="block space-y-1.5 text-sm font-medium text-plum">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-plum/20 bg-white px-3 py-2.5 outline-none focus:border-plum"
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="block space-y-1.5 text-sm font-medium text-plum">
            {mode === "reset" ? "New password" : "Password"}
            <input
              required
              type="password"
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-plum/20 bg-white px-3 py-2.5 outline-none focus:border-plum"
            />
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-plum">{message}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-plum px-4 py-2.5 font-medium text-white transition-opacity disabled:opacity-60"
        >
          {isSubmitting
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Reset password"}
        </button>
      </form>
      {mode === "signin" && (
        <button
          onClick={() => setMode("forgot")}
          className="mt-3 text-sm font-medium text-plum hover:underline"
        >
          Forgot password?
        </button>
      )}
      <p className="text-sm text-mauve mt-3">
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
        ) : mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              onClick={() => setMode("signin")}
              className="font-medium text-plum hover:underline"
            >
              Sign in
            </button>
          </>
        ) : (
          <button
            onClick={() => setMode("signin")}
            className="font-medium text-plum hover:underline"
          >
            Back to sign in
          </button>
        )}
      </p>
    </div>
  );
}

export default function App() {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
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
    </ConvexBetterAuthProvider>
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
