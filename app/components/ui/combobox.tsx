import * as React from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "~/components/ui/popover";

export type ComboboxItem = {
  id: string;
  label: string;
};

type ComboboxProps = {
  items: ComboboxItem[];
  placeholder?: string;
  emptyText?: string;
  onSelect: (item: ComboboxItem) => void;
  onCreate?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** If true, dropdown only shows when user starts typing (default: false - shows on focus) */
  showOnlyWhenTyping?: boolean;
};

export function Combobox({
  items,
  placeholder = "Search...",
  emptyText = "No results found.",
  onSelect,
  onCreate,
  disabled = false,
  className,
  showOnlyWhenTyping = false,
}: ComboboxProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Derived state: open when focused (and has text if showOnlyWhenTyping)
  const isOpen = showOnlyWhenTyping
    ? isFocused && inputValue.length > 0
    : isFocused;

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const exactMatch = items.find(
    (item) => item.label.toLowerCase() === inputValue.trim().toLowerCase(),
  );

  const handleSelect = (item: ComboboxItem) => {
    onSelect(item);
    setInputValue("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleCreate = () => {
    if (onCreate && inputValue.trim()) {
      onCreate(inputValue.trim());
      setInputValue("");
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  console.log("Filtered items:", filteredItems);

  return (
    <Popover open={isOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={(e) => {
              // Delay to allow click events on items to fire first
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget?.closest('[data-slot="popover-content"]')) {
                setTimeout(() => setIsFocused(false), 150);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setIsFocused(false);
                inputRef.current?.blur();
              } else if (e.key === "Enter" && inputValue.trim()) {
                e.preventDefault();
                if (exactMatch) {
                  handleSelect(exactMatch);
                } else if (onCreate) {
                  handleCreate();
                }
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-3 rounded-xl border border-blush/50 bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-plum/30 focus:border-plum/50 text-plum placeholder:text-mauve/50"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filteredItems.length === 0 && !inputValue.trim() && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            {filteredItems.length > 0 && (
              <CommandGroup>
                {filteredItems.slice(0, 6).map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                    className="cursor-pointer"
                  >
                    <Check className={cn("mr-2 h-4 w-4", "opacity-0")} />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {onCreate && inputValue.trim() && !exactMatch && (
              <CommandGroup>
                <CommandItem onSelect={handleCreate} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Create "{inputValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
