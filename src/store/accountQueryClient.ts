import { QueryClient } from "@tanstack/react-query";

export const createAccountQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
