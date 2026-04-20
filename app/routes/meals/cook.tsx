import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { X, Maximize2, Timer, Play, Square, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

type Step = { text: string; timerSeconds?: number };
type ActiveTimer = { stepIndex: number; endTime: number } | null;

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

function FocusedMode({
  steps,
  mealId,
  activeTimer,
  initialStep,
  onClose,
}: {
  steps: Step[];
  mealId: string;
  activeTimer: ActiveTimer;
  initialStep: number;
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const setCooking = useMutation(api.users.setCooking);

  useEffect(() => {
    setCooking({ mealId: mealId as any, stepIndex: currentStep });
  }, [currentStep, setCooking, mealId]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const goForward = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, steps.length]);

  const step = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-white flex flex-col select-none"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-blush/30">
        <span className="text-sm font-medium text-mauve">
          Step {currentStep + 1} of {steps.length}
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-mauve hover:text-plum hover:bg-blush/20 transition-colors"
        >
          <X className="size-6" />
        </button>
      </div>

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
          Tap top to go back · Tap bottom to go forward
        </p>
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
  const mealId = params.id as string;
  const meal = useQuery(api.meals.get, { id: mealId as any });
  const cooking = useQuery(api.meals.getCooking);
  const setCooking = useMutation(api.users.setCooking);
  const clearCooking = useMutation(api.users.clearCooking);
  const [focused, setFocused] = useState(false);
  const [focusedStep, setFocusedStep] = useState(0);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!meal || hasInitialized.current) return;
    hasInitialized.current = true;

    setCooking({
      mealId: mealId as any,
      stepIndex: cooking?.mealId === mealId ? cooking.stepIndex : 0,
    });
  }, [meal, cooking, setCooking, mealId]);

  const handleFinish = useCallback(async () => {
    await clearCooking();
    navigate("/");
  }, [clearCooking, navigate, mealId]);

  if (meal === undefined || cooking === undefined) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-plum/30 border-t-plum rounded-full animate-spin mx-auto"></div>
          <p className="text-mauve mt-4">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (meal === null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-12 bg-white/60 backdrop-blur-sm rounded-2xl border border-blush/50">
          <h2 className="text-xl font-semibold text-plum mb-2">
            Meal not found
          </h2>
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
  const activeTimer: ActiveTimer =
    (cooking?.mealId === mealId ? cooking.activeTimer : null) ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to={`/meals/${mealId}`}
          className="text-mauve hover:text-plum transition-colors text-sm mb-2 inline-block"
        >
          ← Back to {meal.name}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-plum">Cook: {meal.name}</h1>
          <Button
            onClick={() => {
              setFocusedStep(0);
              setFocused(true);
            }}
            variant="outline"
            className="gap-2"
          >
            <Maximize2 className="size-4" />
            Focused Mode
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex gap-4 p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50"
          >
            <span className="w-10 h-10 rounded-full bg-plum/20 text-plum flex items-center justify-center text-lg font-semibold shrink-0">
              {index + 1}
            </span>
            <div className="flex-1 pt-1.5">
              <p className="text-plum text-lg leading-relaxed">{step.text}</p>
              {step.timerSeconds && (
                <div className="mt-2">
                  <TimerButton
                    stepIndex={index}
                    timerSeconds={step.timerSeconds}
                    activeTimer={activeTimer}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button
          onClick={handleFinish}
          variant="outline"
          className="gap-2 text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400"
        >
          <CheckCircle2 className="size-5" />
          All Finished
        </Button>
      </div>

      <AnimatePresence>
        {focused && (
          <FocusedMode
            steps={steps}
            mealId={mealId}
            activeTimer={activeTimer}
            initialStep={focusedStep}
            onClose={() => setFocused(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
