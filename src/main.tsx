import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import "./index.css";
import { router } from "./App.tsx";
import { StrictMode } from "react";
import "./i18n.tsx";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster closeButton position="top-center" richColors />
    <RouterProvider router={router} />
  </StrictMode>,
);
