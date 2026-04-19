import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import { OtterIcon } from "~/components/icons/otter";

const spring = { type: "spring", stiffness: 300, damping: 30 } as const;

export function AppHeader() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <motion.header
      animate={{
        paddingTop: isHome ? "2rem" : "0.75rem",
        paddingBottom: isHome ? "0.5rem" : "0.75rem",
      }}
      transition={spring}
      className="relative overflow-x-hidden"
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
