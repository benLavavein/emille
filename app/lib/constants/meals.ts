import { MoonStar, Sun, Sunrise, type LucideIcon } from "lucide-react";

export const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner"] as const;
type MealTime = (typeof MEAL_TIMES)[number];

export const MEAL_TIME_ICONS = {
  Breakfast: Sunrise,
  Lunch: Sun,
  Dinner: MoonStar,
} as const satisfies Record<MealTime, LucideIcon>;
