import { useState } from "react";
import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import { Menu, Home, UtensilsCrossed, Tag, Store, Calendar, ShoppingCart } from "lucide-react";
import { OtterIcon } from "~/components/icons/otter";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "~/components/ui/sheet";
import { VisuallyHidden } from "radix-ui";

const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/ingredients", label: "Ingredients", icon: Tag },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/meal-plans", label: "Meal Plans", icon: Calendar },
  { href: "/shopping-list", label: "Shopping List", icon: ShoppingCart },
];

function MobileHeader() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="md:hidden bg-plum text-white px-4 py-3 flex items-center">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="size-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" showCloseButton className="!w-full !max-w-full p-0">
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
        </SheetContent>
      </Sheet>
      <span className="flex-1 text-center text-xl font-bold">Emille</span>
      <div className="w-9" />
    </header>
  );
}

function DesktopHeader() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <motion.header
      animate={{
        paddingTop: isHome ? "2rem" : "0.75rem",
        paddingBottom: isHome ? "0.5rem" : "0.75rem",
      }}
      transition={spring}
      className="relative overflow-x-hidden hidden md:block"
    >
      <motion.div
        className="inline-flex"
        style={{ position: "relative" }}
        animate={{
          left: isHome ? "50%" : "100px",
          x: isHome ? "-50%" : "0%",
        }}
        transition={spring}
      >
        <Link to="/" className="flex items-center gap-6 text-plum">
          <motion.div
            animate={{
              width: isHome ? "10rem" : "0rem",
              height: isHome ? "10rem" : "0rem",
              opacity: isHome ? 1 : 0,
            }}
            transition={spring}
            className="overflow-hidden shrink-0"
          >
            <OtterIcon className="w-full h-full" />
          </motion.div>
          <motion.span
            className="font-bold inline-block"
            animate={{ fontSize: isHome ? "3.5rem" : "2rem" }}
            transition={spring}
          >
            Emille
          </motion.span>
        </Link>
      </motion.div>
    </motion.header>
  );
}

export function AppHeader() {
  return (
    <>
      <MobileHeader />
      <DesktopHeader />
    </>
  );
}
