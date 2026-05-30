import { useState } from "react";
import { Link } from "react-router";
import { CookingPot } from "lucide-react";
import { motion } from "motion/react";

type CookButtonProps = {
  mealId: string;
  className?: string;
  size?: "default" | "lg";
};

export function CookButton({ mealId, className, size = "default" }: CookButtonProps) {
  const [hovered, setHovered] = useState(false);

  const isLg = size === "lg";

  return (
    <Link
      to={`/meals/${mealId}/cook?ingredients`}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl bg-peach/50 text-plum font-medium hover:bg-peach transition-colors",
        isLg
          ? "w-full py-4 text-lg gap-3"
          : "px-3 py-1.5 text-sm gap-1.5",
        className ?? "",
      ].join(" ")}
    >
      <motion.span
        animate={hovered ? {
          rotate: [0, -12, 12, -8, 8, 0],
          transition: { duration: 0.5, ease: "easeInOut" },
        } : { rotate: 0 }}
        className="inline-flex"
      >
        <CookingPot className={isLg ? "size-6" : "size-4"} />
      </motion.span>
      Cook
    </Link>
  );
}
