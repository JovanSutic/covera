// src/main.tsx
import { createRoot } from 'react-dom/client';
import { RouterProvider } from "react-router";
import './index.css';
import { router } from './App.tsx';
import { StrictMode } from "react";
import './i18n.tsx';
import { Toaster } from "sonner";

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/* Sonner Toaster stays at the root level */}
        <Toaster closeButton position="top-center" richColors />
        <RouterProvider router={router} />
    </StrictMode>
);
