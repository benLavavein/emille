import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { X, Maximize2, Timer, Play, Square } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

type Step = { text: string; timerSeconds?: number };

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

function useTimer() {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [finished, setFinished] = useState(false);
  const rafRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {}
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    if (endTime === null) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setEndTime(null);
        setFinished(true);
        releaseWakeLock();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [endTime, releaseWakeLock]);

  const start = useCallback(
    (seconds: number) => {
      setFinished(false);
      setEndTime(Date.now() + seconds * 1000);
      setRemaining(seconds);
      acquireWakeLock();
    },
    [acquireWakeLock]
  );

  const stop = useCallback(() => {
    setEndTime(null);
    setRemaining(0);
    setFinished(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const dismiss = useCallback(() => {
    setFinished(false);
  }, []);

  const isRunning = endTime !== null;

  return { remaining, isRunning, finished, start, stop, dismiss };
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
  timerSeconds,
  large,
}: {
  timerSeconds: number;
  large?: boolean;
}) {
  const timer = useTimer();
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (timer.finished && !hasPlayed.current) {
      hasPlayed.current = true;
      playChime();
    }
    if (!timer.finished) {
      hasPlayed.current = false;
    }
  }, [timer.finished]);

  if (timer.finished) {
    return (
      <motion.button
        initial={{ scale: 0.9 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        onClick={(e) => {
          e.stopPropagation();
          timer.dismiss();
        }}
        className={`inline-flex items-center gap-2 rounded-full bg-green-500 text-white font-semibold ${
          large ? "px-6 py-3 text-lg" : "px-3 py-1.5 text-sm"
        }`}
      >
        <Timer className={large ? "size-5" : "size-4"} />
        Done!
      </motion.button>
    );
  }

  if (timer.isRunning) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          timer.stop();
        }}
        className={`inline-flex items-center gap-2 rounded-full bg-plum text-white font-mono font-semibold tabular-nums ${
          large ? "px-6 py-3 text-2xl" : "px-3 py-1.5 text-sm"
        }`}
      >
        <Square className={large ? "size-5" : "size-3.5"} fill="currentColor" />
        {formatTime(timer.remaining)}
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        timer.start(timerSeconds);
      }}
      className={`inline-flex items-center gap-1.5 rounded-full border border-plum/30 text-plum hover:bg-plum/10 transition-colors ${
        large ? "px-5 py-2.5 text-base" : "px-3 py-1 text-xs"
      }`}
    >
      <Play className={large ? "size-4" : "size-3"} fill="currentColor" />
      {formatTimerLabel(timerSeconds)}
    </button>
  );
}

function FocusedMode({
  steps,
  onClose,
}: {
  steps: Step[];
  onClose: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);

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
            initial={(d: number) => ({ opacity: 0, y: d >= 0 ? 60 : -60 })}
            animate={{ opacity: 1, y: 0 }}
            exit={(d: number) => ({ opacity: 0, y: d >= 0 ? -60 : 60 })}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 gap-6"
          >
            <p className="text-2xl md:text-4xl leading-relaxed text-plum text-center font-medium">
              {step.text}
            </p>
            {step.timerSeconds && (
              <div className="z-20 relative">
                <TimerButton timerSeconds={step.timerSeconds} large />
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
                i === currentStep
                  ? "w-8 bg-plum"
                  : "w-1.5 bg-blush/50"
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
  const params = useParams();
  const mealId = params.id as string;
  const meal = useQuery(api.meals.get, { id: mealId as any });
  const [focused, setFocused] = useState(false);

  if (meal === undefined) {
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
            onClick={() => setFocused(true)}
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
                  <TimerButton timerSeconds={step.timerSeconds} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {focused && (
          <FocusedMode
            steps={steps}
            onClose={() => setFocused(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
