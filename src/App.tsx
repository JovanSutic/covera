import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import "./App.scss";

import FormPage from "./pages/FormPage";
import LoginPage from "./pages/LoginPage";
import PassUpdatePage from "./pages/PassUpdatePage";
import AdminDashboard from "./pages/admin/Dashboard";
import HostDashboard from "./pages/host/Dashboard";
import { redirectIfAuthenticated, requireRoleGuard } from "./lib/auth";

const router = createBrowserRouter([
  {
    path: "/login",
    async loader() {
      return redirectIfAuthenticated();
    },
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
    element: <Outlet />,
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
    element: <Outlet />,
    children: [
      {
        path: "dashboard",
        element: <HostDashboard />,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
