import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("meals", "routes/meals/index.tsx"),
  route("meals/new", "routes/meals/new.tsx"),
  route("meals/:id", "routes/meals/details.tsx"),
  route("ingredients", "routes/ingredients/index.tsx"),
  route("ingredients/new", "routes/ingredients/new.tsx"),
  route("stores", "routes/stores/index.tsx"),
  route("stores/new", "routes/stores/new.tsx"),
  route("stores/:id", "routes/stores/details.tsx"),
  route("meal-plans", "routes/meal-plans/index.tsx"),
  route("meal-plans/new", "routes/meal-plans/new.tsx"),
  route("meal-plans/:id", "routes/meal-plans/details.tsx"),
  route("shopping-list", "routes/shopping-list.tsx"),
] satisfies RouteConfig;
