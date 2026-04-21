import { useState } from "react";
import { Link } from "react-router";
import { CookingPot } from "lucide-react";
import { motion } from "motion/react";

export function CookButton({ mealId, className }: { mealId: string; className?: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/meals/${mealId}/cook?ingredients`}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-peach/50 text-plum text-sm font-medium hover:bg-peach transition-colors ${className ?? ""}`}
    >
      <motion.span
        animate={hovered ? {
          rotate: [0, -12, 12, -8, 8, 0],
          transition: { duration: 0.5, ease: "easeInOut" },
        } : { rotate: 0 }}
        className="inline-flex"
      >
        <CookingPot className="size-4" />
      </motion.span>
      Cook
    </Link>
  );
}
