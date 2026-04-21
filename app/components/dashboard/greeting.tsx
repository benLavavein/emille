import { useUser } from "@clerk/react-router";
import { OtterIcon } from "~/components/icons/otter";

/** Time-agnostic — also used inside morning & night pools. */
const GREETINGS_GENERIC = [
  "Hey there, {name}!",
  "Welcome back, {name}!",
  "Good to see you, {name}!",
  "What’s cookin’, {name}?",
  "Ready to cook, {name}?",
  "Hungry yet, {name}?",
  "Let’s get cooking, {name}!",
  "Chef {name} has arrived!",
  "Howdy, {name}!",
  "Bonjour, {name}!",
  "Hola, {name}!",
  "Ahoy, {name}!",
  "Looking good, {name}!",
  "Time to feast, {name}!",
  "Whisk me away, {name}!",
  "Spice things up, {name}!",
  "Chop chop, {name}!",
  "Bon appétit, {name}!",
  "Kitchen calling, {name}!",
  "Hey chef, {name}!",
];

/** 5:00–10:59 — extra lines; generic pool is always eligible too. */
const GREETINGS_MORNING = [
  "Rise and dine, {name}!",
  "Top of the morning, {name}!",
  "Good morning, {name}!",
  "Morning, {name}!",
  "It’s breakfast o’clock, {name}!",
  "Sun’s up, {name}!",
  "Fresh start, {name}!",
  "Wakey wakey, {name}!",
  "Morning chef, {name}!",
  "Skillet’s calling, {name}!",
  "Eggs and ambition, {name}?",
  "Dawn patrol: {name}!",
  "Cutting board’s ready, {name}!",
  "Another day to cook, {name}!",
  "Morning light, {name}!",
  "Up early, {name}?",
  "Stove’s yours, {name}!",
  "Coffee first, {name}?",
  "Early kitchen, {name}?",
  "Hello, sunrise — hi {name}!",
];

/** 18:00–4:59 — extra lines; generic pool is always eligible too. */
const GREETINGS_NIGHT = [
  "Good evening, {name}!",
  "Evening, {name}!",
  "Dinner time, {name}?",
  "Supper o’clock, {name}!",
  "Night shift, {name}?",
  "Slow simmer, {name}.",
  "What’s for dinner, {name}?",
  "Moon’s out, {name}!",
  "Evening glow, {name}!",
  "Stars and stoves, {name}!",
  "Wind down, {name}?",
  "Late kitchen, {name}?",
  "Night owl, {name}?",
  "After dark, {name}?",
  "Evening hunger, {name}?",
  "Sauté the sunset, {name}!",
  "Day’s done — cook on, {name}!",
  "Evening light, {name}!",
  "End strong, {name}!",
  "One more recipe, {name}?",
];

export type GreetingTimeBand = "morning" | "generic" | "night";

/** Which time band we’re in; “generic” = 11:00–17:59 (generic-only pool). */
export function getTimeOfDayPeriod(date: Date): GreetingTimeBand {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 18) return "generic";
  return "night";
}

function greetingPoolForBand(band: GreetingTimeBand): readonly string[] {
  if (band === "morning") {
    return [...GREETINGS_GENERIC, ...GREETINGS_MORNING];
  }
  if (band === "night") {
    return [...GREETINGS_GENERIC, ...GREETINGS_NIGHT];
  }
  return GREETINGS_GENERIC;
}

function hashDailySeed(
  userId: string,
  year: number,
  month: number,
  day: number,
): number {
  let seed = year * 10000 + month * 100 + day;
  for (let i = 0; i < userId.length; i++) {
    seed = seed ^ (userId.charCodeAt(i) * (i + 1));
  }
  return (seed * 2654435761) >>> 0;
}

export function getDailyGreeting(
  name: string,
  userId: string,
  now = new Date(),
): string {
  const band = getTimeOfDayPeriod(now);
  const pool = greetingPoolForBand(band);
  const seed = hashDailySeed(
    userId,
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  const idx = seed % pool.length;
  return pool[idx].replace("{name}", name);
}

export function HeroGreeting() {
  const { user } = useUser();
  const firstName = user?.firstName || user?.username || "my friend";

  return (
    <div className="flex items-center gap-6 mb-12">
      <OtterIcon className="w-40 h-40 shrink-0" />
      <h2 className="text-3xl font-bold text-plum">
        {getDailyGreeting(firstName, user?.id || "")}
      </h2>
    </div>
  );
}
