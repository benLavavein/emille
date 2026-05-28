import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "~/lib/utils";
import { Input } from "./input";

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function roundToEighth(n: number): number {
  return Math.round(n * 8) / 8;
}

// ---------------------------------------------------------------------------
// Parse / format
// ---------------------------------------------------------------------------

/**
 * Parse a user-typed string into a float.
 * Supports: "3", "0.5", "1/2", "3/4", "1 1/2", "2 3/4"
 */
function parseQuantityString(raw: string): number | undefined {
  const s = raw.trim();
  if (!s) return undefined;

  // "1 1/2" — whole + space + fraction
  if (s.includes(" ")) {
    const spaceIdx = s.indexOf(" ");
    const wholeStr = s.slice(0, spaceIdx);
    const rest = s.slice(spaceIdx + 1).trim();
    const whole = parseFloat(wholeStr);
    if (isNaN(whole)) return undefined;
    if (rest.includes("/")) {
      const [numStr, denStr] = rest.split("/");
      const num = parseFloat(numStr);
      const den = parseFloat(denStr);
      if (isNaN(num) || isNaN(den) || den === 0) return undefined;
      return whole + num / den;
    }
    return whole;
  }

  // "1/2"
  if (s.includes("/")) {
    const [numStr, denStr] = s.split("/");
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);
    if (isNaN(num) || isNaN(den) || den === 0) return undefined;
    return num / den;
  }

  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

/**
 * Convert a float to { whole, numerator, denominator } snapped to the nearest
 * eighth.  Used by both the display component and formatForInput.
 */
function floatToFraction(value: number): {
  whole: string;
  numerator: string;
  denominator: string;
} {
  if (isNaN(value)) return { whole: "", numerator: "", denominator: "" };

  const rounded = roundToEighth(value);
  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  if (frac < 0.001) {
    return {
      whole: whole === 0 ? "" : String(whole),
      numerator: "",
      denominator: "",
    };
  }

  const eighths = Math.round(frac * 8);
  const g = gcd(eighths, 8);
  return {
    whole: whole === 0 ? "" : String(whole),
    numerator: String(eighths / g),
    denominator: String(8 / g),
  };
}

/**
 * Format a stored value as the string shown in the text input when editing.
 * Whole numbers → "3"; fractions → "1/2"; mixed → "1 1/2".
 */
function formatForInput(value: number | undefined): string {
  if (value == null) return "";
  const rounded = roundToEighth(value);
  const { whole, numerator, denominator } = floatToFraction(rounded);

  if (numerator && denominator) {
    return whole
      ? `${whole} ${numerator}/${denominator}`
      : `${numerator}/${denominator}`;
  }

  return whole || "";
}

/**
 * Filter a raw onChange value to only permit valid quantity characters.
 *
 * Allowed formats: "3", "0.5", "1/2", "1 1/2"
 *
 * Rules:
 * - Digits are always allowed.
 * - One space allowed, only after digits and only if no `.` is present yet
 *   (decimals and mixed-number notation don't mix).
 * - One `/` allowed, only after a digit (or digit+space+digit).
 * - One `.` allowed, only if no `/` or space is present and the last char is a digit.
 */
function filterInput(next: string): string {
  let result = "";
  let hasDot = false;
  let hasSlash = false;
  let hasSpace = false;

  for (const ch of next) {
    if (/\d/.test(ch)) {
      result += ch;
    } else if (
      ch === " " &&
      !hasSpace &&
      !hasDot &&
      result.length > 0 &&
      /\d$/.test(result)
    ) {
      hasSpace = true;
      result += ch;
    } else if (
      ch === "/" &&
      !hasSlash &&
      result.length > 0 &&
      /\d$/.test(result)
    ) {
      hasSlash = true;
      result += ch;
    } else if (
      ch === "." &&
      !hasDot &&
      !hasSlash &&
      !hasSpace &&
      result.length > 0 &&
      /\d$/.test(result)
    ) {
      hasDot = true;
      result += ch;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Display component (shown when not editing)
// ---------------------------------------------------------------------------

function DisplayFraction({ value }: { value: number | undefined }) {
  if (value == null) return <span>—</span>;
  const parts = floatToFraction(value);
  const hasFrac = parts.numerator && parts.denominator;

  if (!parts.whole && !hasFrac) return <span>—</span>;

  return (
    <span className="inline-flex items-baseline gap-1.5">
      {parts.whole && <span>{parts.whole}</span>}
      {hasFrac && (
        <span className="text-sm tracking-tighter">
          <sup>{parts.numerator}</sup>
          <span>/</span>
          <sub>{parts.denominator}</sub>
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// QuantityInput
// ---------------------------------------------------------------------------

type QuantityInputProps = {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  className?: string;
};

function QuantityInput({ value, onChange, className }: QuantityInputProps) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef<number | undefined>(undefined);

  // Keep lastEmitted in sync when value changes externally
  useEffect(() => {
    if (!editing) lastEmitted.current = value;
  }, [value, editing]);

  const enterEdit = () => {
    setRaw(formatForInput(value));
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(filterInput(e.target.value));
  };

  const handleBlur = () => {
    const parsed = parseQuantityString(raw);
    const result =
      parsed != null
        ? Math.max(0, Math.min(999, roundToEighth(parsed)))
        : undefined;
    lastEmitted.current = result;
    onChange(result);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={enterEdit}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && enterEdit()}
        className={cn(
          "flex h-10 w-32 cursor-text items-center rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm px-4 text-sm text-plum transition-colors hover:border-plum/30",
          className,
        )}
      >
        <DisplayFraction value={value} />
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="amt"
      maxLength={6}
      className={cn("w-32", className)}
    />
  );
}

export { QuantityInput, DisplayFraction };
