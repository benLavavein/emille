import * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "flex w-full min-w-0 rounded-xl border border-blush/50 bg-white/60 px-4 py-3 text-base text-plum backdrop-blur-sm outline-none transition-[color,box-shadow]",
        "placeholder:text-mauve/50",
        "focus-visible:ring-2 focus-visible:ring-plum/30 focus-visible:border-plum/50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-plum",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
