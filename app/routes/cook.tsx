import { useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { CookingPot, ChevronRight, CheckCircle2, Timer } from "lucide-react";
import { Button } from "~/components/ui/button";
import { motion } from "motion/react";

export function meta() {
  return [
    { title: "Cooking - Emille" },
    { name: "description", content: "Currently cooking" },
  ];
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CookScreen() {
  const navigate = useNavigate();
  const sessions = useQuery(api.meals.getCooking);
  const clearOneCooking = useMutation(api.users.clearOneCooking);
  const clearCooking = useMutation(api.users.clearCooking);

  if (sessions === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        <CookingPot className="size-12 text-plum/30" />
        <p className="text-mauve">Nothing is cooking right now.</p>
        <Button variant="outline" onClick={() => navigate("/meals")}>
          Browse meals
        </Button>
      </div>
    );
  }

  const now = Date.now();

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <CookingPot className="size-7 text-plum" />
        <h1 className="text-2xl font-bold text-plum">Cooking</h1>
        <span className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-mauve text-xs"
            onClick={async () => {
              await clearCooking();
              navigate("/meals");
            }}
          >
            Done with everything
          </Button>
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {sessions.map((session) => {
          const timerRemaining = session.activeTimer
            ? Math.max(
                0,
                Math.round((session.activeTimer.endTime - now) / 1000),
              )
            : null;
          const timerRunning =
            timerRemaining !== null && timerRemaining > 0;

          return (
            <motion.div
              key={session.mealId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur-sm border border-blush/50 rounded-2xl overflow-hidden"
            >
              {/* Card header — tap to go to cook page */}
              <button
                type="button"
                onClick={() => navigate(`/meals/${session.mealId}/cook`)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-plum truncate">
                    {session.mealName}
                  </p>
                  <p className="text-sm text-mauve mt-0.5">
                    Step {session.stepIndex + 1} of {session.totalSteps}
                  </p>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-blush/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-plum rounded-full transition-all"
                      style={{
                        width: `${((session.stepIndex + 1) / session.totalSteps) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {timerRunning && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-plum text-white text-xs font-mono font-semibold tabular-nums">
                      <Timer className="size-3" />
                      {formatTime(timerRemaining!)}
                    </span>
                  )}
                  <ChevronRight className="size-5 text-mauve/50" />
                </div>
              </button>

              {/* Done button */}
              <div className="border-t border-blush/30 px-4 py-2 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    clearOneCooking({ mealId: session.mealId as any })
                  }
                  className="inline-flex items-center gap-1.5 text-sm text-mauve hover:text-green-600 transition-colors py-1"
                >
                  <CheckCircle2 className="size-4" />
                  Done
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
