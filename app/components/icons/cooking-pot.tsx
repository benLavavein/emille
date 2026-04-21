import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback } from "react";

interface SteamParticle {
  id: number;
  x: number;
  dx: number;
  size: number;
}

let nextParticleId = 0;

export function CookingPotIcon({
  active = false,
  className,
  fill = "currentColor",
}: {
  active?: boolean;
  className?: string;
  fill?: string;
}) {
  const [particles, setParticles] = useState<SteamParticle[]>([]);

  const spawnParticle = useCallback(() => {
    const id = nextParticleId++;
    const particle: SteamParticle = {
      id,
      x: 180 + Math.random() * 150,
      dx: (Math.random() - 0.5) * 36,
      size: 6 + Math.random() * 9,
    };
    setParticles((prev) => [...prev, particle]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = 380 + Math.random() * 520;
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        spawnParticle();
        scheduleNext();
      }, delay);
    };

    for (let i = 0; i < 4; i++) {
      window.setTimeout(() => {
        if (!cancelled) spawnParticle();
      }, i * 180 + Math.random() * 120);
    }
    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [active, spawnParticle]);

  /* viewBox extends above y=0 so steam isn't clipped; overflow visible for DOM */
  return (
    <svg
      viewBox="0 -110 511 571"
      className={`overflow-visible ${className ?? ""}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.circle
            key={p.id}
            r={p.size}
            fill={fill}
            initial={{ cx: p.x, cy: 52, opacity: 0, r: p.size * 0.36 }}
            animate={{
              cx: p.x + p.dx,
              cy: -94,
              opacity: [0, 0.38, 0],
              r: p.size * 1.08,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.85,
              cx: { duration: 2.85, ease: [0.28, 0.06, 0.22, 1] },
              /* Linear rise = no mid-air easing hiccups */
              cy: { duration: 2.85, ease: "linear" },
              r: { duration: 2.85, ease: [0.25, 0.1, 0.25, 1] },
              opacity: {
                duration: 2.85,
                times: [0, 0.1, 1],
                ease: [0.33, 0, 0.15, 1],
              },
            }}
          />
        ))}
      </AnimatePresence>

      <g transform="translate(0, 17)">
        <motion.g
          style={{ originX: "255px", originY: "187px" }}
          animate={
            active
              ? {
                  rotate: [0, -6, 6, -4, 4, -2, 2, 0],
                  y: [0, -3, 0, -2, 0],
                }
              : { rotate: 0, y: 0 }
          }
          transition={
            active
              ? { duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }
              : { duration: 0.3 }
          }
        >
          <defs>
            <clipPath id="pot-lid-clip">
              <rect x="0" y="0" width="511" height="177" />
            </clipPath>
          </defs>
          <g clipPath="url(#pot-lid-clip)">
            <path
              fill={fill}
              d="M487.5,228H447v-18.234c9.29-3.138,16-11.93,16-22.266c0-12.191-9.332-22.241-21.227-23.388
            c-30.72-26.382-92.626-44.265-162.773-47.56V99h0.5c12.958,0,23.5-10.542,23.5-23.5S292.458,52,279.5,52h-48
            C218.542,52,208,62.542,208,75.5S218.542,99,231.5,99h0.5v17.552c-70.147,3.295-132.053,21.178-162.773,47.56
            C57.332,165.259,48,175.309,48,187.5c0,10.336,6.71,19.128,16,22.266V228H23.5C10.542,228,0,238.542,0,251.5S10.542,275,23.5,275
            h16c13.509,0,24.5,10.991,24.5,24.5v104c0,30.603,24.897,55.5,55.5,55.5h272c30.603,0,55.5-24.897,55.5-55.5v-104
            c0-13.509,10.991-24.5,24.5-24.5h16c12.958,0,23.5-10.542,23.5-23.5S500.458,228,487.5,228z M255.5,131
            c64.863,0,124.315,12.584,159.975,33H95.525C131.185,143.584,190.637,131,255.5,131z M223,75.5c0-4.687,3.813-8.5,8.5-8.5h48
            c4.687,0,8.5,3.813,8.5,8.5s-3.813,8.5-8.5,8.5h-48C226.813,84,223,80.187,223,75.5z M247,99h17v17.074
            c-2.824-0.048-5.657-0.074-8.5-0.074s-5.676,0.027-8.5,0.074V99z M71.5,179h368c4.687,0,8.5,3.813,8.5,8.5s-3.813,8.5-8.5,8.5h-368
            c-4.687,0-8.5-3.813-8.5-8.5S66.813,179,71.5,179z M39.5,260h-16c-4.687,0-8.5-3.813-8.5-8.5s3.813-8.5,8.5-8.5H64v25.551
            C57.261,263.205,48.75,260,39.5,260z M391.5,444h-272c-19.768,0-36.264-14.241-39.792-33h231.79c4.142,0,7.5-3.358,7.5-7.5
            s-3.358-7.5-7.5-7.5H79V211h353v185h-40.503c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h39.796
            C427.764,429.759,411.268,444,391.5,444z M487.5,260h-16c-9.25,0-17.761,3.205-24.5,8.551V243h40.5c4.687,0,8.5,3.813,8.5,8.5
            S492.187,260,487.5,260z"
            />
          </g>
        </motion.g>
      </g>

      <g>
        <defs>
          <clipPath id="pot-base-clip">
            <rect x="0" y="196" width="511" height="265" />
          </clipPath>
        </defs>
        <g clipPath="url(#pot-base-clip)">
          <path
            fill={fill}
            d="M359.497,396H343.5c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h15.997c4.142,0,7.5-3.358,7.5-7.5
            S363.639,396,359.497,396z"
          />
          <path
            fill={fill}
            d="M487.5,228H447v-18.234c9.29-3.138,16-11.93,16-22.266c0-12.191-9.332-22.241-21.227-23.388
            c-30.72-26.382-92.626-44.265-162.773-47.56V99h0.5c12.958,0,23.5-10.542,23.5-23.5S292.458,52,279.5,52h-48
            C218.542,52,208,62.542,208,75.5S218.542,99,231.5,99h0.5v17.552c-70.147,3.295-132.053,21.178-162.773,47.56
            C57.332,165.259,48,175.309,48,187.5c0,10.336,6.71,19.128,16,22.266V228H23.5C10.542,228,0,238.542,0,251.5S10.542,275,23.5,275
            h16c13.509,0,24.5,10.991,24.5,24.5v104c0,30.603,24.897,55.5,55.5,55.5h272c30.603,0,55.5-24.897,55.5-55.5v-104
            c0-13.509,10.991-24.5,24.5-24.5h16c12.958,0,23.5-10.542,23.5-23.5S500.458,228,487.5,228z M255.5,131
            c64.863,0,124.315,12.584,159.975,33H95.525C131.185,143.584,190.637,131,255.5,131z M223,75.5c0-4.687,3.813-8.5,8.5-8.5h48
            c4.687,0,8.5,3.813,8.5,8.5s-3.813,8.5-8.5,8.5h-48C226.813,84,223,80.187,223,75.5z M247,99h17v17.074
            c-2.824-0.048-5.657-0.074-8.5-0.074s-5.676,0.027-8.5,0.074V99z M71.5,179h368c4.687,0,8.5,3.813,8.5,8.5s-3.813,8.5-8.5,8.5h-368
            c-4.687,0-8.5-3.813-8.5-8.5S66.813,179,71.5,179z M39.5,260h-16c-4.687,0-8.5-3.813-8.5-8.5s3.813-8.5,8.5-8.5H64v25.551
            C57.261,263.205,48.75,260,39.5,260z M391.5,444h-272c-19.768,0-36.264-14.241-39.792-33h231.79c4.142,0,7.5-3.358,7.5-7.5
            s-3.358-7.5-7.5-7.5H79V211h353v185h-40.503c-4.142,0-7.5,3.358-7.5,7.5s3.358,7.5,7.5,7.5h39.796
            C427.764,429.759,411.268,444,391.5,444z M487.5,260h-16c-9.25,0-17.761,3.205-24.5,8.551V243h40.5c4.687,0,8.5,3.813,8.5,8.5
            S492.187,260,487.5,260z"
          />
          <path
            fill={fill}
            d="M407.5,259c4.142,0,7.5-3.358,7.5-7.5v-16c0-4.142-3.358-7.5-7.5-7.5s-7.5,3.358-7.5,7.5v16
            C400,255.642,403.358,259,407.5,259z"
          />
          <path
            fill={fill}
            d="M407.5,347c4.142,0,7.5-3.358,7.5-7.5v-56c0-4.142-3.358-7.5-7.5-7.5s-7.5,3.358-7.5,7.5v56
            C400,343.642,403.358,347,407.5,347z"
          />
        </g>
      </g>
    </svg>
  );
}
