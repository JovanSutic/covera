import { Outlet, ScrollRestoration, useNavigation } from "react-router";
import Header from "@/components/Header";
import { ProgressBar } from "./ProgressBar";
import { RouteAnnouncer } from "./RouteAnnouncer";

export function Shell() {
  const navigation = useNavigation();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <ProgressBar isNavigating={navigation.state === "loading"} />
      <Outlet />
      <ScrollRestoration getKey={(location) => location.pathname} />
      <RouteAnnouncer />
    </div>
  );
}
