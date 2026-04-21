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
    <div className="flex flex-col md:flex-row h-[calc(100vh-3rem)] md:h-screen min-h-0 w-full">
      {/* Queue: full width on mobile when browsing list; hidden on mobile when viewing a meal */}
      <aside
        className={
          isDetail
            ? "hidden md:flex md:w-72 md:shrink-0 md:flex-col md:min-h-0 md:border-r md:border-blush/50 md:bg-white/60 md:backdrop-blur-sm"
            : "flex flex-col min-h-0 w-full flex-1 md:w-72 md:shrink-0 md:flex-none md:border-r md:border-blush/50 md:bg-white/60 md:backdrop-blur-sm"
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
