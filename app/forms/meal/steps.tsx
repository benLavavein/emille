import { useEffect, useRef, useState } from "react";
import { customAlphabet } from "nanoid";
import { ChevronUp, ChevronDown, ArrowUpDown, Timer, X, Plus } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Button } from "~/components/ui/button";
import { Input, InputSlot } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { MealFormApi, MealFormValues } from "./index";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

type Props = {
  form: MealFormApi;
};

export function StepsSection({ form }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-plum">
          Recipe Steps
        </label>
        <form.Field name="steps" mode="array">
          {(stepsField) =>
            stepsField.state.value.length > 1 ? (
              <button
                type="button"
                onClick={() => setIsReordering((v) => !v)}
                className={`flex items-center justify-center gap-1 text-xs w-16 transition-colors ${
                  isReordering
                    ? "text-plum font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                {isReordering ? "Done" : "Reorder"}
              </button>
            ) : null
          }
        </form.Field>
      </div>

      <form.Field name="steps" mode="array">
        {(stepsField) => (
          <>
            <LayoutGroup>
              <div className="flex flex-col gap-1.5 mb-4">
                <AnimatePresence initial={false}>
                  {stepsField.state.value.map((step, index) => (
                    <motion.div
                      key={step._id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                      className="flex items-center gap-1 rounded-xl bg-white/50 border border-blush/30 px-1"
                    >
                      {expandedIndex === index ? (
                        <ExpandedStep
                          form={form}
                          index={index}
                          onCollapse={() => setExpandedIndex(null)}
                        />
                      ) : (
                        <CollapsedStep
                          step={step}
                          index={index}
                          onClick={() => setExpandedIndex(index)}
                        />
                      )}

                      {isReordering ? (
                        <div className="flex flex-col items-center justify-center shrink-0 w-9">
                          <button
                            type="button"
                            onClick={() => {
                              stepsField.moveValue(index, index - 1);
                              if (expandedIndex === index)
                                setExpandedIndex(index - 1);
                              else if (expandedIndex === index - 1)
                                setExpandedIndex(index);
                            }}
                            disabled={index === 0}
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-1"
                          >
                            <ChevronUp className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stepsField.moveValue(index, index + 1);
                              if (expandedIndex === index)
                                setExpandedIndex(index + 1);
                              else if (expandedIndex === index + 1)
                                setExpandedIndex(index);
                            }}
                            disabled={
                              index === stepsField.state.value.length - 1
                            }
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/20 transition-colors p-1"
                          >
                            <ChevronDown className="size-5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            stepsField.removeValue(index);
                            setExpandedIndex(null);
                          }}
                          className="shrink-0 text-muted-foreground/50 hover:text-foreground hover:bg-transparent"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </LayoutGroup>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newIndex = stepsField.state.value.length;
                stepsField.pushValue({ _id: nanoid(), text: "", timerMinutes: "" });
                setExpandedIndex(newIndex);
              }}
              className="w-full mt-1"
            >
              <Plus />
              Add Step
            </Button>
          </>
        )}
      </form.Field>
    </div>
  );
}

function CollapsedStep({
  step,
  index,
  onClick,
}: {
  step: MealFormValues["steps"][number];
  index: number;
  onClick: () => void;
}) {
  const timerMins = parseFloat(step.timerMinutes);
  const hasTimer = timerMins > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-0 text-left py-3 px-3 cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium text-muted-foreground shrink-0 leading-relaxed">
          {index + 1}.
        </span>
        <div className="min-w-0">
          <p className="text-sm text-plum leading-relaxed">
            {step.text || "Empty step"}
          </p>
          {hasTimer && (
            <div className="flex items-center gap-1 mt-1">
              <Timer className="size-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                {timerMins} min
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function ExpandedStep({
  form,
  index,
  onCollapse,
}: {
  form: MealFormApi;
  index: number;
  onCollapse: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const [timerOpen, setTimerOpen] = useState(() => {
    const val = form.getFieldValue(`steps[${index}].timerMinutes`);
    return parseFloat(val) > 0;
  });

  const handleBlur = (e: React.FocusEvent) => {
    if (
      containerRef.current &&
      e.relatedTarget instanceof Node &&
      containerRef.current.contains(e.relatedTarget)
    ) {
      return;
    }
    onCollapse();
  };

  return (
    <div
      ref={containerRef}
      className="flex items-start gap-2 flex-1 py-3 px-2"
      onBlur={handleBlur}
    >
      <div className="flex flex-col items-center shrink-0 w-7 gap-1 pt-1">
        <span className="text-sm font-medium text-muted-foreground leading-none">
          {index + 1}.
        </span>
        <button
          type="button"
          onClick={() => {
            const opening = !timerOpen;
            setTimerOpen(opening);
            if (!opening) {
              form.setFieldValue(`steps[${index}].timerMinutes`, "");
            }
          }}
          title={timerOpen ? "Remove timer" : "Add timer"}
          className={`transition-colors ${
            timerOpen
              ? "text-plum"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          }`}
        >
          <Timer className="size-5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <form.Field name={`steps[${index}].text`}>
          {(field) => (
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              autoFocus
              textareaClassName="px-2 py-1 text-sm"
            />
          )}
        </form.Field>

        {timerOpen && (
          <div className="flex items-center gap-1.5 px-2">
            <Timer className="h-3 w-3 text-muted-foreground shrink-0" />
            <form.Field name={`steps[${index}].timerMinutes`}>
              {(field) => (
                <Input
                  type="number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className="w-24 h-7 rounded-lg border-transparent"
                  inputClassName="px-2 text-xs"
                >
                  <InputSlot className="text-xs pr-2">min</InputSlot>
                </Input>
              )}
            </form.Field>
          </div>
        )}
      </div>
    </div>
  );
}
