import * as React from "react";
import { Link, NavLink } from "react-router";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { cn } from "~/lib/utils";

/** Column shell: header stays in document flow; only {@link QueueBody} scrolls. */
export const Queue = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex min-h-0 w-full flex-1 flex-col overflow-hidden",
      className,
    )}
    {...props}
  />
);

export type QueueSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export type QueueHeaderProps = {
  title: string;
  /** Shown on small screens only. */
  mobileBackUrl?: string;
  /** If set, renders the add action linking here (e.g. `/meals/add`). */
  addTo?: string;
  addLabel?: string;
  /** Omit to hide the search row. */
  search?: QueueSearchProps;
};

function QueueHeaderSearch({
  value,
  onChange,
  placeholder = "Search…",
}: QueueSearchProps) {
  return (
    <div className="relative mt-3 w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mauve/50" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-blush/50 bg-white/80 py-2 pl-9 pr-3 text-sm text-plum placeholder:text-mauve/50 focus:border-plum/40 focus:outline-none focus:ring-2 focus:ring-plum/25"
      />
    </div>
  );
}

export function QueueHeader({
  title,
  mobileBackUrl,
  addTo,
  addLabel = "Add",
  search,
}: QueueHeaderProps) {
  return (
    <header className="shrink-0 border-b border-blush/40 bg-white/80 px-3 pt-3 pb-2 backdrop-blur-md md:px-4 md:pt-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {mobileBackUrl ? (
            <Link
              to={mobileBackUrl}
              className="shrink-0 rounded-lg p-1.5 -ml-1 text-mauve transition-colors hover:bg-blush/20 hover:text-plum md:hidden"
            >
              <ChevronLeft className="size-6" />
            </Link>
          ) : null}
          <h1 className="truncate text-lg font-bold text-plum">{title}</h1>
        </div>
        {addTo ? (
          <Link
            to={addTo}
            className="shrink-0 rounded-lg bg-plum p-2 text-white transition-colors hover:bg-plum/90"
            title={addLabel}
          >
            <Plus className="size-4" />
          </Link>
        ) : null}
      </div>
      {search ? (
        <QueueHeaderSearch
          value={search.value}
          onChange={search.onChange}
          placeholder={search.placeholder}
        />
      ) : null}
    </header>
  );
}

export const QueueFooter = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      "flex shrink-0 items-center border-t border-blush/40 bg-white/80 px-3 py-2.5 backdrop-blur-sm",
      className,
    )}
  >
    {children}
  </div>
);

/** Sole vertical scroll region for the queue (list / empty states). */
export const QueueBody = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    className={cn(
      "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:thin]",
      className,
    )}
    {...props}
  />
);

/** Shared row chrome for `QueueItem` or `NavLink` / `className` callbacks. */
export function queueRowClassName(options: {
  active?: boolean;
  className?: string;
}) {
  const { active, className } = options;
  return cn(
    "flex w-full items-center gap-2 py-2.5 pl-3.5 pr-3.5 text-left text-sm transition-colors",
    active
      ? "bg-plum/12 font-medium text-plum"
      : "text-plum hover:bg-blush/30",
    className,
  );
}

export const QueueItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean;
  }
>(function QueueItem({ active, className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={queueRowClassName({ active, className })}
      {...props}
    >
      {children}
    </div>
  );
});
QueueItem.displayName = "QueueItem";

/** Discriminated list state that pairs well with Convex `useQuery` (`undefined` ⇒ loading). */
export type QueueListState<T> =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "noMatch" }
  | { status: "ready"; data: T[] };

/**
 * Builds list state from a Convex array query and a filtered view of that array.
 * - `source`: the query result (e.g. `useQuery(api.meals.list)`).
 * - `filtered`: client-filtered array (use the same reference as `source` when not filtering).
 */
export function queueListStateFromConvex<T>(
  source: T[] | undefined,
  filtered: T[],
): QueueListState<T> {
  if (source === undefined) return { status: "loading" };
  if (source.length === 0) return { status: "empty" };
  if (filtered.length === 0) return { status: "noMatch" };
  return { status: "ready", data: filtered };
}

export interface QueueItemsProps<T> {
  listDataState: QueueListState<T>;
  getItemKey: (data: T) => string;
  renderItem: (data: T) => React.ReactNode;
  /** When set, each row is a navigation link with shared row styling. */
  itemTo?: (data: T) => string;
  /** Used when `itemTo` is omitted (e.g. selectable rows). Ignored for link rows. */
  onRowClick?: (data: T) => void;
  isActive?: (data: T) => boolean;
  renderLoading?: () => React.ReactNode;
  /** Shown when the list is empty; default copy is baked into shared styling. */
  emptyText?: string;
}

const DEFAULT_EMPTY_TEXT = "Nothing here yet.";

export function QueueItems<T>({
  listDataState,
  getItemKey,
  renderItem,
  itemTo,
  onRowClick,
  isActive,
  renderLoading,
  emptyText = DEFAULT_EMPTY_TEXT,
}: QueueItemsProps<T>) {
  const loading = renderLoading ?? defaultLoading;

  if (listDataState.status === "loading") {
    return (
      <div className="min-h-0 flex-1">
        {loading()}
      </div>
    );
  }

  if (listDataState.status === "empty") {
    return (
      <div className="min-h-0 flex-1">
        <p className="px-2 py-8 text-center text-sm text-mauve">{emptyText}</p>
      </div>
    );
  }

  if (listDataState.status === "noMatch") {
    return (
      <div className="min-h-0 flex-1">
        <p className="px-2 py-8 text-center text-sm text-mauve">No matches.</p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <ul className="m-0 list-none p-0">
        {listDataState.data.map((data) => {
          const key = getItemKey(data);
          const inner = renderItem(data);

          if (itemTo) {
            return (
              <li key={key}>
                <NavLink
                  to={itemTo(data)}
                  className={({ isActive: navActive }) =>
                    queueRowClassName({ active: navActive })
                  }
                >
                  {inner}
                </NavLink>
              </li>
            );
          }

          const active = isActive?.(data) ?? false;
          return (
            <li key={key}>
              <QueueItem
                active={active}
                onClick={
                  onRowClick
                    ? () => {
                        onRowClick(data);
                      }
                    : undefined
                }
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(data);
                        }
                      }
                    : undefined
                }
              >
                {inner}
              </QueueItem>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function defaultLoading() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-plum/30 border-t-plum" />
    </div>
  );
}
