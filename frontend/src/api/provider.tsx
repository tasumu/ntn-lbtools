import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useMemo } from "react";

type Props = {
  children: ReactNode;
};

export function ApiProvider({ children }: Props) {
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
    []
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
