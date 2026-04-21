import { Outlet, useLocation } from "react-router";
import { IngredientsQueue } from "./components/ingredients-queue";

function useIsIngredientDetailPath() {
  const { pathname } = useLocation();
  if (pathname === "/ingredients" || pathname === "/ingredients/") return false;
  return /^\/ingredients\/[^/]+$/.test(pathname);
}

export default function IngredientsLayout() {
  const isDetail = useIsIngredientDetailPath();

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      <aside
        className={
          isDetail
            ? "hidden h-full min-h-0 md:flex md:w-72 md:shrink-0 md:flex-col md:border-r md:border-blush/50 md:bg-white/60 md:backdrop-blur-sm"
            : "flex h-full min-h-0 w-full flex-1 flex-col md:w-72 md:shrink-0 md:flex-none md:border-r md:border-blush/50 md:bg-white/60 md:backdrop-blur-sm"
        }
      >
        <IngredientsQueue />
      </aside>

      <main
        className={
          isDetail
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white/40"
            : "hidden md:flex md:min-h-0 md:min-w-0 md:flex-1 md:flex-col md:overflow-hidden md:bg-white/40"
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
