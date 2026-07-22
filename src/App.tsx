import "./App.scss";
import { createBrowserRouter, Outlet } from "react-router";
import FormPage from "./pages/FormPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import PassUpdatePage from "./pages/PassUpdatePage.tsx";
import { requireRoleGuard } from "./lib/auth.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminDashboard from "./pages/admin/Dashboard.tsx";
import HostDashboard from "./pages/host/Dashboard.tsx";

const queryClient = new QueryClient();

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
   {
    path: "/update-password",
    element: <PassUpdatePage />,
  },
  {
    path: "/",
    element: <FormPage />,
  },
  {
    path: "/form",
    element: <FormPage />,
  },
  {
    path: "/admin",
    async loader() {
      return requireRoleGuard("admin");
    },
    element: (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    ),
    children: [
      {
        path: "dashboard",
        element: <AdminDashboard />,
      },
    ],
  },
  {
    path: "/host",
    async loader() {
      return requireRoleGuard("host");
    },
    element: (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    ),
    children: [
      {
        path: "dashboard",
        element: <HostDashboard />,
      },
    ],
  },
]);