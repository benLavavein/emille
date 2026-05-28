import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  /** Applied directly to the inner <textarea>. Use for text/padding overrides. */
  textareaClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, textareaClassName, onChange, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    const setRef = (el: HTMLTextAreaElement | null) => {
      (innerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref)
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "0";
      el.style.height = el.scrollHeight + "px";
    };

    useEffect(resize, [props.value]);

    return (
      <div
        className={cn(
          "flex w-full min-w-0 cursor-text rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm transition-colors",
          "has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-plum/30 has-[textarea:focus-visible]:border-plum/50",
          "has-[textarea:disabled]:cursor-not-allowed has-[textarea:disabled]:opacity-50",
          className,
        )}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("textarea, button, a")) return;
          innerRef.current?.focus();
        }}
      >
        <textarea
          ref={setRef}
          rows={1}
          onInput={resize}
          onChange={onChange}
          className={cn(
            "w-full min-w-0 border-0 bg-transparent px-4 py-3 text-base text-plum outline-none",
            "placeholder:text-mauve/50",
            "disabled:cursor-not-allowed",
            "resize-none overflow-hidden",
            "md:text-sm",
            textareaClassName,
          )}
          {...props}
        />
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
