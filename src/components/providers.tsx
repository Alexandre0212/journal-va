"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: true, staleTime: 30_000, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
