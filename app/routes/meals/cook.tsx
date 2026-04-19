import { useState, useCallback } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { X, Maximize2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { AnimatePresence, motion } from "motion/react";

export function meta() {
  return [
    { title: "Cook Mode - Emille" },
    { name: "description", content: "Step-by-step cooking guide" },
  ];
}

function FocusedMode({
  steps,
  onClose,
}: {
  steps: string[];
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
        {/* Tap zone: top half goes back */}
        <button
          onClick={goBack}
          disabled={currentStep === 0}
          className="absolute inset-x-0 top-0 h-1/2 z-10 cursor-pointer disabled:cursor-default"
          aria-label="Previous step"
        />
        {/* Tap zone: bottom half goes forward */}
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
            className="flex-1 flex items-center justify-center px-8 md:px-16"
          >
            <p className="text-2xl md:text-4xl leading-relaxed text-plum text-center font-medium">
              {steps[currentStep]}
            </p>
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
        {meal.steps.map((step: string, index: number) => (
          <div
            key={index}
            className="flex gap-4 p-5 bg-white/60 backdrop-blur-sm rounded-xl border border-blush/50"
          >
            <span className="w-10 h-10 rounded-full bg-plum/20 text-plum flex items-center justify-center text-lg font-semibold shrink-0">
              {index + 1}
            </span>
            <p className="text-plum text-lg pt-1.5 leading-relaxed">{step}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {focused && (
          <FocusedMode
            steps={meal.steps}
            onClose={() => setFocused(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
