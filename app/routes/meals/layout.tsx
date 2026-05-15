import { Outlet, useLocation } from "react-router";
import { MealsQueue } from "./components/meals-queue";

function useIsMealDetailPath() {
  const { pathname } = useLocation();
  if (pathname === "/meals" || pathname === "/meals/") return false;
  // Nested under this layout: /meals/:id only (not /meals/add — different route)
  return /^\/meals\/[^/]+$/.test(pathname);
}

export default function MealsLayout() {
  const isDetail = useIsMealDetailPath();

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      {/* Queue: full width on mobile when browsing list; hidden on mobile when viewing a meal */}
      <aside
        className={
          isDetail
            ? "hidden h-full min-h-0 md:flex md:w-86 md:shrink-0 md:flex-col md:border-r md:border-blush/50 md:bg-white/60 md:backdrop-blur-sm"
            : "flex h-full min-h-0 w-full flex-1 flex-col md:w-86 md:shrink-0 md:flex-none md:border-r md:border-blush/50 md:bg-white/60 md:backdrop-blur-sm"
        }
      >
        <MealsQueue />
      </aside>

      {/* Detail / empty: full screen on mobile when meal selected; split on md+ */}
      <main
        className={
          isDetail
            ? "flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden bg-white/40"
            : "hidden md:flex md:flex-1 md:min-h-0 md:min-w-0 md:flex-col md:overflow-hidden md:bg-white/40"
        }
      >
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
