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
  const clearCooking = useMutation(api.users.clearCooking);
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
    <div className="mb-8">
      <div
        className={`h-44 rounded-2xl border-2 bg-white/80 backdrop-blur-sm flex items-center px-6 gap-3 ${
          isCooking ? "border-peach/50" : "border-blush/50"
        }`}
      >
        <div className="overflow-visible shrink-0">
          <CookingPotIcon active={isCooking} className="w-24 h-24 text-plum" />
        </div>

        <div className="flex-1 min-w-0 h-26 relative">
          <motion.div
            className="absolute inset-0 flex flex-col justify-center min-h-0"
            initial={false}
            animate={{ opacity: isCooking ? 1 : 0 }}
            transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
            style={{ pointerEvents: isCooking ? "auto" : "none" }}
          >
            {mealForFade && (
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
            )}
          </motion.div>

          <motion.p
            className="absolute inset-0 flex items-center text-mauve text-sm leading-snug"
            initial={false}
            animate={{ opacity: isCooking ? 0 : 1 }}
            transition={{ duration: 0.42, ease: [0.4, 0, 0.2, 1] }}
            style={{ pointerEvents: isCooking ? "none" : "auto" }}
          >
            The kitchen is quiet.. Too quiet.
          </motion.p>
        </div>

        <div className="w-29 shrink-0 flex items-center justify-center self-center h-29">
          <motion.div
            className="size-29"
            initial={false}
            animate={{ opacity: isCooking ? 1 : 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ pointerEvents: isCooking ? "auto" : "none" }}
          >
            <Button
              type="button"
              variant="outline"
              className="size-29 rounded-xl p-2 text-sm font-medium text-plum border-peach/60 whitespace-normal leading-snug hover:bg-gray-50 hover:text-plum"
              onClick={() => clearCooking()}
            >
              I&apos;m finished!
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
