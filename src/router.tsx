import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // جلسة Supabase محفوظة في localStorage، لذا تُنفَّذ حراسة المسارات على العميل
    defaultSsr: false,
  });

  return router;
};
