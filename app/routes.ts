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
] satisfies RouteConfig;
