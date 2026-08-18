import { createBrowserRouter, RouterProvider, Outlet } from "react-router";
import "./App.scss";

import { redirectIfAuthenticated, requireRoleGuard } from "./lib/auth";

const router = createBrowserRouter([
  {
    path: "/login",
    async loader() {
      return redirectIfAuthenticated();
    },
    lazy: async () => {
      const { default: Component } = await import("./pages/LoginPage");
      return { Component };
    },
  },
  {
    path: "/update-password",
    lazy: async () => {
      const { default: Component } = await import("./pages/PassUpdatePage");
      return { Component };
    },
  },
  {
    path: "/",
    lazy: async () => {
      const { default: Component } = await import("./pages/FormPage");
      return { Component };
    },
  },
  {
    path: "/form",
    lazy: async () => {
      const { default: Component } = await import("./pages/FormPage");
      return { Component };
    },
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
        lazy: async () => {
          const { default: Component } = await import("./pages/admin/Dashboard");
          return { Component };
        },
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
        lazy: async () => {
          const { default: Component } = await import("./pages/host/Dashboard");
          return { Component };
        },
      },
      {
        path: "apartments",
        lazy: async () => {
          const { default: Component } = await import("./pages/host/ApartmentList");
          return { Component };
        },
      },
      {
        path: "apartments/:id",
        lazy: async () => {
          const { default: Component } = await import(
            "./pages/host/IndividualApartment"
          );
          return { Component };
        },
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}