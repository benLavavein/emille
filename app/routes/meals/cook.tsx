import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { X, Timer, Play, Square, CheckCircle2, Carrot, ListOrdered } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type Step = { text: string; timerSeconds?: number };
type ActiveTimer = { stepIndex: number; endTime: number } | null;

const FRACTION_MAP: [number, string][] = [
  [0.125, "⅛"], [0.25, "¼"], [0.333, "⅓"], [0.375, "⅜"],
  [0.5, "½"], [0.625, "⅝"], [0.667, "⅔"], [0.75, "¾"], [0.875, "⅞"],
];

function formatAmount(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "";
  if (Number.isInteger(amount)) return String(amount);
  const whole = Math.floor(amount);
  const frac = amount - whole;
  const closest = FRACTION_MAP.reduce((best, [val, sym]) =>
    Math.abs(frac - val) < Math.abs(frac - best[0]) ? [val, sym] : best
  );
  if (Math.abs(frac - (closest[0] as number)) < 0.05) {
    return whole > 0 ? `${whole}${closest[1]}` : (closest[1] as string);
  }
  return String(parseFloat(amount.toFixed(2)));
}

function useWakeLock() {
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    const acquire = async () => {
      try {
        wakeLock.current = await navigator.wakeLock.request("screen");
      } catch {}
    };

    acquire();

    const reacquire = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", reacquire);

    return () => {
      document.removeEventListener("visibilitychange", reacquire);
      wakeLock.current?.release();
    };
  }, []);
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTimerLabel(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
  }
  return `${seconds}s`;
}

function useCountdown(endTime: number | null) {
  const [, forceRender] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (endTime === null) return;

    const tick = () => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      forceRender((n) => n + 1);
      if (left > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [endTime]);

  if (endTime === null) return 0;
  return Math.max(0, Math.round((endTime - Date.now()) / 1000));
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });

    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch {}
}

function TimerButton({
  stepIndex,
  timerSeconds,
  activeTimer,
  large,
}: {
  stepIndex: number;
  timerSeconds: number;
  activeTimer: ActiveTimer;
  large?: boolean;
}) {
  const startTimer = useMutation(api.users.startTimer);
  const clearTimer = useMutation(api.users.clearTimer);

  const isThisStep = activeTimer?.stepIndex === stepIndex;
  const endTime = isThisStep ? activeTimer!.endTime : null;
  const remaining = useCountdown(endTime);

  const isRunning = isThisStep && remaining > 0;
  const justFinished = isThisStep && endTime !== null && remaining === 0;

  const hasPlayed = useRef(false);

  useEffect(() => {
    if (justFinished && !hasPlayed.current) {
      hasPlayed.current = true;
      playChime();
      clearTimer();
    }
    if (!justFinished) {
      hasPlayed.current = false;
    }
  }, [justFinished, clearTimer]);

  const handleStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      startTimer({ stepIndex, durationSeconds: timerSeconds });
    },
    [startTimer, stepIndex, timerSeconds],
  );

  const handleStop = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      clearTimer();
    },
    [clearTimer],
  );

  if (justFinished) {
    return (
      <motion.button
        initial={{ scale: 0.9 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        onClick={handleStop}
        className={`inline-flex items-center gap-2 rounded-full bg-green-500 text-white font-semibold ${
          large ? "px-6 py-3 text-lg" : "px-3 py-1.5 text-sm"
        }`}
      >
        <Timer className={large ? "size-5" : "size-4"} />
        Done!
      </motion.button>
    );
  }

  if (isRunning) {
    return (
      <button
        onClick={handleStop}
        className={`inline-flex items-center gap-2 rounded-full bg-plum text-white font-mono font-semibold tabular-nums ${
          large ? "px-6 py-3 text-2xl" : "px-3 py-1.5 text-sm"
        }`}
      >
        <Square className={large ? "size-5" : "size-3.5"} fill="currentColor" />
        {formatTime(remaining)}
      </button>
    );
  }

  const anotherTimerActive = activeTimer && activeTimer.stepIndex !== stepIndex;

  return (
    <button
      onClick={handleStart}
      disabled={!!anotherTimerActive}
      className={`inline-flex items-center gap-1.5 rounded-full border border-plum/30 text-plum transition-colors ${
        anotherTimerActive
          ? "opacity-40 cursor-not-allowed"
          : "hover:bg-plum/10"
      } ${large ? "px-5 py-2.5 text-base" : "px-3 py-1 text-xs"}`}
    >
      <Play className={large ? "size-4" : "size-3"} fill="currentColor" />
      {formatTimerLabel(timerSeconds)}
    </button>
  );
}

function IngredientsOverlay({
  ingredients,
  onClose,
}: {
  ingredients: { name: string; amount?: number; unit?: string; notes?: string }[];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 bg-white flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-blush/30">
        <span className="text-lg font-semibold text-plum">Ingredients</span>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-mauve hover:text-plum hover:bg-blush/20 transition-colors"
        >
          <X className="size-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="divide-y divide-blush/30">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <span className="text-mauve min-w-20 text-sm">
                {[formatAmount(ing.amount), ing.unit].filter(Boolean).join(" ") || "—"}
              </span>
              <span className="font-medium text-plum">{ing.name}</span>
              {ing.notes && (
                <span className="text-mauve/70 text-sm">({ing.notes})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function meta() {
  return [
    { title: "Cook Mode - Emille" },
    { name: "description", content: "Step-by-step cooking guide" },
  ];
}

export default function CookPage() {
  useWakeLock();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mealId = params.id as string;
  const meal = useQuery(api.meals.get, { id: mealId as any });
  const cooking = useQuery(api.meals.getCooking);
  const setCooking = useMutation(api.users.setCooking);
  const clearCooking = useMutation(api.users.clearCooking);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [showIngredients, setShowIngredients] = useState(
    () => searchParams.has("ingredients")
  );
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!meal || hasInitialized.current) return;
    hasInitialized.current = true;

    const resumeStep = cooking?.mealId === mealId ? cooking.stepIndex : 0;
    setCurrentStep(resumeStep);
    setCooking({ mealId: mealId as any, stepIndex: resumeStep });
  }, [meal, cooking, setCooking, mealId]);

  useEffect(() => {
    if (hasInitialized.current && meal) {
      setCooking({ mealId: mealId as any, stepIndex: currentStep });
    }
  }, [currentStep, setCooking, mealId, meal]);

  const handleFinish = useCallback(async () => {
    await clearCooking();
    navigate(`/meals/${mealId}`);
  }, [clearCooking, navigate, mealId]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const goForward = useCallback(() => {
    if (!meal) return;
    setDirection(1);
    setCurrentStep((s) => Math.min(meal.steps.length - 1, s + 1));
  }, [meal]);

  if (meal === undefined || cooking === undefined) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (meal === null) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">Meal not found</h2>
          <Link
            to="/meals"
            className="inline-block px-6 py-3 bg-plum text-white rounded-lg hover:bg-plum/90 transition-colors font-medium mt-4"
          >
            Back to meals
          </Link>
        </div>
      </div>
    );
  }

  const steps: Step[] = meal.steps;
  const step = steps[currentStep];
  const activeTimer: ActiveTimer =
    (cooking?.mealId === mealId ? cooking.activeTimer : null) ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-blush/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-mauve">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-mauve/50 hidden sm:inline">· {meal.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFinish}
            className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
            title="All Finished"
          >
            <CheckCircle2 className="size-5" />
          </button>
          <Link
            to={`/meals/${mealId}`}
            className="p-2 rounded-lg text-mauve hover:text-plum hover:bg-blush/20 transition-colors"
          >
            <X className="size-6" />
          </Link>
        </div>
      </div>

      {/* Main step area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <button
          onClick={goBack}
          disabled={currentStep === 0}
          className="absolute inset-x-0 top-0 h-1/2 z-10 cursor-pointer disabled:cursor-default"
          aria-label="Previous step"
        />
        <button
          onClick={goForward}
          disabled={currentStep === steps.length - 1}
          className="absolute inset-x-0 bottom-0 h-1/2 z-10 cursor-pointer disabled:cursor-default"
          aria-label="Next step"
        />

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={{
              enter: (d: number) => ({ opacity: 0, y: d >= 0 ? 40 : -40 }),
              center: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 38 } },
              exit: (d: number) => ({ opacity: 0, y: d >= 0 ? -40 : 40, transition: { duration: 0.1 } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 gap-6"
          >
            <p className="text-2xl md:text-4xl leading-relaxed text-plum text-center font-medium">
              {step.text}
            </p>
            {step.timerSeconds && (
              <div className="z-20 relative">
                <TimerButton
                  stepIndex={currentStep}
                  timerSeconds={step.timerSeconds}
                  activeTimer={activeTimer}
                  large
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-blush/30">
        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? "w-8 bg-plum" : "w-1.5 bg-blush/50"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-mauve/50 mt-2">
          Tap top half to go back · Tap bottom half to go forward
        </p>
      </div>

      {/* Floating toggle button */}
      <button
        onClick={() => setShowIngredients(true)}
        className="fixed top-20 right-4 z-55 bg-white/90 backdrop-blur-sm border border-blush/50 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow text-plum"
        title="View ingredients"
      >
        <Carrot className="size-5" />
      </button>

      {/* Ingredients overlay */}
      <AnimatePresence>
        {showIngredients && (
          <IngredientsOverlay
            ingredients={meal.ingredientsWithDetails.map((ing: any) => ({
              name: ing.name || ing.ingredient?.name || "Unknown",
              amount: ing.amount,
              unit: ing.unit,
              notes: ing.notes,
            }))}
            onClose={() => setShowIngredients(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
