import { trpc } from "@/lib/trpc";
import { HelmetProvider } from "react-helmet-async";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// ── Chunk-reload handler ──────────────────────────────────────────────────────
// After a deploy, Vite renames hashed JS chunks. Open browser sessions that try
// to lazy-load an old chunk get a "Failed to fetch dynamically imported module"
// error. We catch it here and do a single hard-reload to pick up the new build.
// A sessionStorage flag prevents infinite reload loops if the new build is also broken.
const handleChunkError = (msg: string) => {
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  ) {
    const key = "__chunk_reload_attempted";
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
  }
};
window.addEventListener("error", (event) => handleChunkError(event.message ?? ""));
window.addEventListener("unhandledrejection", (event) => handleChunkError(String(event.reason ?? "")));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent React Query from refetching on every window-focus event.
      // Without this, typing in any textarea causes the window to receive a
      // focus event, which triggers stale-query refetches that re-render
      // AppLayout and steal focus from the active input after each character.
      refetchOnWindowFocus: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
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
      url: "/api/trpc",
      transformer: superjson,
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
  <HelmetProvider>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </HelmetProvider>
);
