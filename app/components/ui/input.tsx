import * as React from "react";
import { cn } from "~/lib/utils";

interface InputProps extends Omit<React.ComponentProps<"input">, "prefix"> {
  /**
   * Applied directly to the inner <input> element.
   * Use for text/padding overrides (e.g. "text-center px-2").
   * `className` itself targets the outer wrapper div (sizing, layout).
   */
  inputClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputClassName, type, children, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    const setRef = (el: HTMLInputElement | null) => {
      (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    };

    return (
      <div
        className={cn(
          "flex h-10 w-full min-w-0 cursor-text items-center rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm transition-colors",
          "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-plum/30 has-[input:focus-visible]:border-plum/50",
          "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
          className,
        )}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("input, button, a")) return;
          const input = innerRef.current;
          if (!input) return;
          const isEndSlot = !!target.closest("[data-input-slot='end']");
          const cursor = isEndSlot ? input.value.length : 0;
          requestAnimationFrame(() => {
            try {
              input.setSelectionRange(cursor, cursor);
            } catch {}
            input.focus();
          });
        }}
      >
        <input
          ref={setRef}
          type={type}
          spellCheck="false"
          className={cn(
            "flex-1 min-w-0 border-0 bg-transparent px-4 text-base text-plum outline-none",
            "placeholder:text-mauve/50",
            "disabled:cursor-not-allowed",
            "md:text-sm",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            inputClassName,
          )}
          {...props}
        />
        {children}
      </div>
    );
  },
);

Input.displayName = "Input";

function InputSlot({
  children,
  side = "end",
  className,
}: {
  children: React.ReactNode;
  side?: "start" | "end";
  className?: string;
}) {
  return (
    <span
      data-input-slot={side}
      className={cn(
        "text-mauve/60 text-sm pointer-events-none select-none shrink-0",
        side === "end" ? "pr-4" : "pl-4 order-first",
        className,
      )}
    >
      {children}
    </span>
  );
}

export { Input, InputSlot };
