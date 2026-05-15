import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Timer } from "lucide-react";
import { CookingPotIcon } from "~/components/icons/cooking-pot";
import { Button } from "~/components/ui/button";
import { motion } from "motion/react";

function useCountdown(endTime: number | null) {
  const [, forceRender] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (endTime === null) return;

    const tick = () => {
      forceRender((n) => n + 1);
      if (Math.max(0, Math.round((endTime - Date.now()) / 1000)) > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [endTime]);

  if (endTime === null) return 0;
  return Math.max(0, Math.round((endTime - Date.now()) / 1000));
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CookingCard() {
  const cooking = useQuery(api.meals.getCooking);
  const endTime = cooking?.activeTimer?.endTime ?? null;
  const remaining = useCountdown(endTime);
  const timerRunning = endTime !== null && remaining > 0;

  const snapshotRef = useRef<{
    mealId: string;
    mealName: string;
    stepIndex: number;
    totalSteps: number;
  } | null>(null);
  useEffect(() => {
    if (cooking) snapshotRef.current = cooking;
  }, [cooking]);

  const mealForFade = cooking ?? snapshotRef.current;

  const isCooking = cooking !== null;

  if (cooking === undefined) return null;

  return (
    <div
      className={`h-44 rounded-2xl border-2 bg-white/80 backdrop-blur-sm flex items-center px-6 gap-3`}
    >
      <div className="overflow-visible shrink-0">
        <CookingPotIcon active={isCooking} className="size-32 mb-6 text-plum" />
      </div>

      {isCooking && mealForFade ? (
        <Link
          to={`/meals/${mealForFade.mealId}/cook`}
          className="group block min-h-0 rounded-lg -m-1 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/35 focus-visible:ring-offset-2"
        >
          <div className="flex items-baseline gap-6 min-w-0">
            <h2 className="text-sm font-semibold text-plum shrink-0">
              Currently cooking
            </h2>
            <span className="text-sm font-medium text-mauve shrink-0 opacity-0 translate-x-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0">
              Continue -&gt;
            </span>
          </div>
          <p className="mt-0.5 min-w-0 text-plum font-medium text-lg truncate transition-transform duration-200 ease-out origin-left group-hover:scale-[1.06]">
            {mealForFade.mealName}
          </p>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <p className="text-mauve text-sm">
              Step {mealForFade.stepIndex + 1} of {mealForFade.totalSteps}
            </p>
            {timerRunning && isCooking && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-plum text-white text-sm font-mono font-semibold tabular-nums">
                <Timer className="size-3.5" />
                {formatTime(remaining)}
              </span>
            )}
          </div>
        </Link>
      ) : (
        <span className="text-mauve text-sm grow text-center">
          The kitchen is quiet.. Too quiet.
        </span>
      )}
    </div>
  );
}
