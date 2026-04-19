import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "~/lib/utils";
import { Input } from "./input";

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function floatToFraction(value: number): {
  whole: string;
  numerator: string;
  denominator: string;
} {
  if (value == null || isNaN(value))
    return { whole: "", numerator: "", denominator: "" };

  const whole = Math.floor(value);
  const fractional = value - whole;

  if (fractional < 0.001) {
    return {
      whole: whole === 0 ? "" : String(whole),
      numerator: "",
      denominator: "",
    };
  }

  // Find the best fraction with single-digit denominators (2-9)
  let bestNum = 0;
  let bestDen = 1;
  let bestError = Infinity;

  for (let den = 2; den <= 9; den++) {
    const num = Math.round(fractional * den);
    if (num <= 0 || num >= den) continue;
    const error = Math.abs(fractional - num / den);
    if (error < bestError) {
      bestError = error;
      bestNum = num;
      bestDen = den;
    }
  }

  if (bestNum === 0) {
    return {
      whole: whole === 0 ? "" : String(whole),
      numerator: "",
      denominator: "",
    };
  }

  const divisor = gcd(bestNum, bestDen);
  return {
    whole: whole === 0 ? "" : String(whole),
    numerator: String(bestNum / divisor),
    denominator: String(bestDen / divisor),
  };
}

function partsToFloat(
  whole: string,
  numerator: string,
  denominator: string,
): number | undefined {
  const w = parseInt(whole, 10) || 0;
  const n = parseInt(numerator, 10) || 0;
  const d = parseInt(denominator, 10) || 0;

  if (w === 0 && n === 0) return undefined;

  if (n > 0 && d > 1) {
    return w + n / d;
  }
  return w || undefined;
}

type QuantityInputProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
};

function DisplayFraction({ value }: { value: number | undefined }) {
  if (value == null) return <span>—</span>
  const parts = floatToFraction(value)
  const hasFrac = parts.numerator && parts.denominator

  if (!parts.whole && !hasFrac) return <span>—</span>

  return (
    <span className="inline-flex items-baseline gap-1.5">
      {parts.whole && <span>{parts.whole}</span>}
      {hasFrac && (
        <span className="text-[0.75em] tracking-tighter">
          <sup>{parts.numerator}</sup>
          <span>/</span>
          <sub>{parts.denominator}</sub>
        </span>
      )}
    </span>
  )
}

function QuantityInput({ value, onChange, className }: QuantityInputProps) {
  const [whole, setWhole] = useState("");
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const [editing, setEditing] = useState(false);
  const [fractionFocused, setFractionFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wholeRef = useRef<HTMLInputElement>(null);
  const numRef = useRef<HTMLInputElement>(null);
  const denRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<number | undefined>(undefined);

  // Sync from external value prop only when it differs from what we last emitted
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const parts = floatToFraction(value ?? NaN);
    setWhole(parts.whole);
    setNumerator(parts.numerator);
    setDenominator(parts.denominator);
    lastEmitted.current = value;
  }, [value]);

  const emitChange = useCallback(
    (w: string, n: string, d: string) => {
      const next = partsToFloat(w, n, d);
      lastEmitted.current = next;
      onChange(next);
    },
    [onChange],
  );

  const enterEdit = () => {
    const parts = floatToFraction(value ?? NaN);
    setWhole(parts.whole);
    setNumerator(parts.numerator);
    setDenominator(parts.denominator);
    setEditing(true);
    requestAnimationFrame(() => wholeRef.current?.focus());
  };

  const handleContainerBlur = (e: React.FocusEvent) => {
    const movingTo = e.relatedTarget as Node | null;
    if (containerRef.current?.contains(movingTo)) return;
    normalizeFraction();
    setFractionFocused(false);
    setEditing(false);
  };

  const handleWholeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const cleaned = raw.replace(/^0+(\d)/, "$1");
    const capped = parseInt(cleaned, 10) > 99 ? "99" : cleaned;
    setWhole(capped);
    emitChange(capped, numerator, denominator);
  };

  const handleNumeratorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^1-9]/g, "").slice(0, 1);
    setNumerator(raw);
    emitChange(whole, raw, denominator);
  };

  const handleDenominatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^2-9]/g, "").slice(0, 1);
    setDenominator(raw);
    emitChange(whole, numerator, raw);
  };

  const handleWholeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "/") {
      e.preventDefault();
      if (!whole) setWhole("1");
      numRef.current?.focus();
    }
  };

  const normalizeFraction = () => {
    const n = parseInt(numerator, 10) || 0;
    const d = parseInt(denominator, 10) || 0;

    if (n === 0 || d <= 1) {
      setNumerator("");
      setDenominator("");
      emitChange(whole, "", "");
      return;
    }

    let w = parseInt(whole, 10) || 0;

    if (n >= d) {
      w = Math.min(w + Math.floor(n / d), 99);
      const remainder = n % d;
      if (remainder === 0) {
        setWhole(String(w));
        setNumerator("");
        setDenominator("");
        emitChange(String(w), "", "");
        return;
      }
      const divisor = gcd(remainder, d);
      setWhole(String(w));
      setNumerator(String(remainder / divisor));
      setDenominator(String(d / divisor));
      emitChange(String(w), String(remainder / divisor), String(d / divisor));
      return;
    }

    const divisor = gcd(n, d);
    const reducedN = String(n / divisor);
    const reducedD = String(d / divisor);
    setNumerator(reducedN);
    setDenominator(reducedD);
    emitChange(whole || String(w), reducedN, reducedD);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={enterEdit}
        className={cn(
          "inline-flex items-center justify-center h-8 min-w-12 px-2 rounded-md border border-input bg-transparent text-sm shadow-xs hover:bg-accent transition-colors",
          className,
        )}
      >
        <DisplayFraction value={value} />
      </button>
    );
  }

  const hasFraction = numerator !== "" || denominator !== "";
  const showFractionProminent = fractionFocused || hasFraction;

  return (
    <div
      ref={containerRef}
      onBlur={handleContainerBlur}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <Input
        ref={wholeRef}
        type="text"
        inputMode="numeric"
        value={whole}
        onChange={handleWholeChange}
        onKeyDown={handleWholeKeyDown}
        placeholder="0"
        className="w-12 px-1 text-center text-sm h-8"
      />
      <div
        className={cn(
          "inline-flex items-center gap-0.5 transition-opacity",
          showFractionProminent ? "opacity-100" : "opacity-30",
        )}
      >
        <Input
          ref={numRef}
          type="text"
          inputMode="numeric"
          value={numerator}
          onChange={handleNumeratorChange}
          onFocus={() => setFractionFocused(true)}
          placeholder="–"
          className="w-8 px-0 text-center text-sm h-8"
        />
        <span className="text-muted-foreground text-sm select-none">/</span>
        <Input
          ref={denRef}
          type="text"
          inputMode="numeric"
          value={denominator}
          onChange={handleDenominatorChange}
          onFocus={() => setFractionFocused(true)}
          placeholder="–"
          className="w-8 px-0 text-center text-sm h-8"
        />
      </div>
    </div>
  );
}

export { QuantityInput };
