import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { SESSION_TOKEN_KEY } from "./authSession";
import "./index.css";

const queryClient = new QueryClient();

const PRODUCTION_API_BASE_URL =
  "https://dr-strategy-tracker-ai-research-production.up.railway.app";

const getApiUrl = () => {
  const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  const apiBaseUrl =
    configuredApiBaseUrl ||
    (typeof window !== "undefined" && window.location.hostname.endsWith(".pages.dev")
      ? PRODUCTION_API_BASE_URL
      : "");
  return apiBaseUrl ? `${apiBaseUrl}/api/trpc` : "/api/trpc";
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  localStorage.removeItem(SESSION_TOKEN_KEY);
  queryClient.setQueryData([["auth", "me"], { type: "query" }], null);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getApiUrl(),
      transformer: superjson,
      headers() {
        const token = localStorage.getItem(SESSION_TOKEN_KEY);
        return token ? { authorization: `Bearer ${token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
