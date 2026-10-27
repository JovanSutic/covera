import { QueryClient } from "@tanstack/react-query";

/**
 * The app's one query cache, created here so route modules can prefetch into it
 * without importing React (§4). `main.tsx` passes this same instance to
 * `<QueryClientProvider>`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15,
    },
  },
});
