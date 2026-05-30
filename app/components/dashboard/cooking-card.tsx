import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Timer } from "lucide-react";
import { CookingPotIcon } from "~/components/icons/cooking-pot";

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
  const sessions = useQuery(api.meals.getCooking);

  const snapshotRef = useRef<typeof sessions>(null);
  useEffect(() => {
    if (sessions && sessions.length > 0) snapshotRef.current = sessions;
  }, [sessions]);

  const activeSessions = sessions ?? [];
  const isCooking = activeSessions.length > 0;
  const primary = activeSessions[0] ?? snapshotRef.current?.[0] ?? null;

  // Find the earliest active timer across all sessions
  const activeTimer =
    activeSessions.find((s) => s?.activeTimer)?.activeTimer ?? null;
  const endTime = activeTimer?.endTime ?? null;
  const remaining = useCountdown(endTime);
  const timerRunning = endTime !== null && remaining > 0;

  if (sessions === undefined) return null;

  return (
    <div className="h-44 rounded-2xl border-2 bg-white/80 backdrop-blur-sm flex items-center px-3 md:px-6 gap-3">
      <div className="overflow-visible shrink-0">
        <CookingPotIcon
          active={isCooking}
          className="size-24 md:size-32 mb-6 text-plum"
        />
      </div>

      {isCooking && primary ? (
        <Link
          to="/cook"
          className="group block min-w-0 flex-1 overflow-hidden rounded-lg -m-1 p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum/35 focus-visible:ring-offset-2"
        >
          <div className="flex items-baseline gap-6 min-w-0 w-full">
            <h2 className="text-sm font-semibold text-plum shrink-0">
              Currently cooking
            </h2>
            <span className="text-sm font-medium text-mauve shrink-0 opacity-0 translate-x-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0">
              View all →
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-plum font-medium text-lg leading-tight line-clamp-1 transition-transform duration-200 ease-out origin-left group-hover:scale-[1.06]">
              {primary.mealName}
            </p>
            {activeSessions.length > 1 && (
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-plum/10 text-plum font-medium">
                +{activeSessions.length - 1} more
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 flex-wrap">
            <p className="text-mauve text-sm">
              Step {primary.stepIndex + 1} of {primary.totalSteps}
            </p>
            {timerRunning && (
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
