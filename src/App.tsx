import "./App.scss";
import { createBrowserRouter, redirect } from "react-router";
import FormPage from "./pages/FormPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import { supabase } from "./lib/supabase.ts";
import DashboardPage from "./pages/DashboardPage.tsx";
/* import { supabase } from './lib/supabase'; */

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
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
    path: "/dashboard",
    async loader() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return redirect("/login");
      }
      return null;
    },
    children: [
      {
        path: "",
        element: <DashboardPage />,
      },
    ],
  },
]);
