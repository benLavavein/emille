import { useState } from "react";
import { useNavigate } from "react-router";
import { CookingPot, Repeat } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";

type SideAttachment = {
  sideId: string;
  name: string;
  alwaysInclude: boolean;
};

type CookButtonProps = {
  mealId: string;
  className?: string;
  size?: "default" | "lg";
  sideAttachments?: SideAttachment[];
};

export function CookButton({
  mealId,
  className,
  size = "default",
  sideAttachments = [],
}: CookButtonProps) {
  const navigate = useNavigate();
  const startCookingMany = useMutation(api.users.startCookingMany);

  const [hovered, setHovered] = useState(false);
  const [showSidesDialog, setShowSidesDialog] = useState(false);
  const [selectedSideIds, setSelectedSideIds] = useState<Set<string>>(
    new Set(),
  );

  const autoSides = sideAttachments.filter((s) => s.alwaysInclude);
  const optionalSides = sideAttachments.filter((s) => !s.alwaysInclude);

  const isLg = size === "lg";

  const handleCook = async (extraIds: string[] = []) => {
    const mealIds = [mealId, ...autoSides.map((s) => s.sideId), ...extraIds];
    await startCookingMany({ mealIds: mealIds as any });
    navigate("/cook");
  };

  const handleClick = () => {
    if (optionalSides.length > 0) {
      setSelectedSideIds(new Set());
      setShowSidesDialog(true);
    } else {
      handleCook();
    }
  };

  const handleConfirmSides = () => {
    setShowSidesDialog(false);
    handleCook([...selectedSideIds]);
  };

  const toggleSide = (sideId: string) => {
    setSelectedSideIds((prev) => {
      const next = new Set(prev);
      if (next.has(sideId)) next.delete(sideId);
      else next.add(sideId);
      return next;
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl bg-peach/50 text-plum font-medium hover:bg-peach transition-colors",
          isLg ? "w-full py-4 text-lg gap-3" : "px-3 py-1.5 text-sm gap-1.5",
          className ?? "",
        ].join(" ")}
      >
        <motion.span
          animate={
            hovered
              ? {
                  rotate: [0, -12, 12, -8, 8, 0],
                  transition: { duration: 0.5, ease: "easeInOut" },
                }
              : { rotate: 0 }
          }
          className="inline-flex"
        >
          <CookingPot className={isLg ? "size-6" : "size-4"} />
        </motion.span>
        Cook
      </button>

      {/* Optional sides dialog */}
      <AnimatePresence>
        {showSidesDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setShowSidesDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-6 shadow-xl md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm md:rounded-2xl"
            >
              <h2 className="text-lg font-semibold text-plum mb-1">
                Cook with pairings?
              </h2>
              <p className="text-sm text-mauve mb-4">
                Choose which pairings to cook alongside this meal.
              </p>

              {autoSides.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-mauve/60 font-medium mb-2">
                    Always included
                  </p>
                  <div className="flex flex-col gap-2">
                    {autoSides.map((s) => (
                      <div
                        key={s.sideId}
                        className="flex items-center gap-2 px-3 py-2 bg-plum/5 rounded-lg"
                      >
                        <Repeat className="size-3.5 text-plum/60" />
                        <span className="text-sm text-plum font-medium">
                          {s.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mb-5">
                {optionalSides.map((s) => {
                  const checked = selectedSideIds.has(s.sideId);
                  return (
                    <button
                      key={s.sideId}
                      type="button"
                      onClick={() => toggleSide(s.sideId)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                        checked
                          ? "border-plum bg-plum/5"
                          : "border-blush/50 bg-white hover:border-plum/30"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? "bg-plum border-plum"
                            : "border-mauve/30"
                        }`}
                      >
                        {checked && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            viewBox="0 0 10 8"
                            fill="none"
                          >
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-plum">
                        {s.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSidesDialog(false)}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmSides}>
                  <CookingPot className="size-4 mr-2" />
                  Let's cook
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
