import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useUser, useClerk } from "@clerk/react-router";
import {
  Menu,
  Home,
  UtensilsCrossed,
  Store,
  Calendar,
  ShoppingCart,
  LogOut,
  ChevronLeft,
  Users,
} from "lucide-react";
import { OtterIcon } from "~/components/icons/otter";
import { useBackButton } from "~/lib/back-button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "~/components/ui/sheet";
import { VisuallyHidden } from "radix-ui";
import { Button } from "./ui/button";

export const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/meal-plan", label: "Meal plan", icon: Calendar },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
  { href: "/friends", label: "Friends", icon: Users },
];

function MobileHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const firstName = user?.firstName || user?.username || "User";
  const { backUrl } = useBackButton();

  const effectiveBackUrl = backUrl ?? "/";

  return (
    <header className="md:hidden bg-plum text-white px-4 h-15 flex items-center sticky top-0 z-40">
      <div className="w-10 flex items-center">
        {location.pathname !== "/" && (
          <Link
            to={effectiveBackUrl}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="size-6" />
          </Link>
        )}
      </div>
      <Link to="/" className="flex-1 text-center text-2xl font-bold">
        Emille
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="size-6" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton
          className="w-full! max-w-full! p-0"
        >
          <VisuallyHidden.Root>
            <SheetTitle>Navigation</SheetTitle>
          </VisuallyHidden.Root>
          <div className="flex flex-col items-center pt-12 pb-8">
            <OtterIcon className="w-32 h-32 text-plum" />
            <h2 className="text-3xl font-bold text-plum mt-2">Emille</h2>
          </div>
          <nav className="flex flex-col px-6 gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  to={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-lg font-medium transition-colors ${
                    isActive
                      ? "bg-plum/10 text-plum"
                      : "text-mauve hover:bg-blush/30 hover:text-plum"
                  }`}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-6 pb-8 pt-4 border-t border-blush/30 mx-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-plum truncate">
                {firstName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-mauve"
                onClick={() => signOut()}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function DesktopSidebar() {
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const firstName = user?.firstName || user?.username || "User";

  return (
    <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col bg-plum text-white md:flex">
      <Link to="/" className="px-6 py-7">
        <span className="text-2xl font-bold">Emille</span>
      </Link>

      <nav className="flex flex-col gap-0.5 px-3">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(href);
          return (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="px-4 py-4 border-t border-white/15">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium text-white/80">{firstName}</span>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AppHeader() {
  return <MobileHeader />;
}

export { DesktopSidebar };
