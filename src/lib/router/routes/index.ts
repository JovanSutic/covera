import type { RouteNode } from "../defineRoutes";

export type AppRoutes = readonly RouteNode[];

export { appRoutes, outsideRoutes } from "./public";
export { adminRoutes } from "./admin";
export { hostRoutes } from "./host";
