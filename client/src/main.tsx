import { trpc } from "@/lib/trpc";
import { HelmetProvider } from "react-helmet-async";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";

// Read from runtime config injected by the Express server (works in both dev and production).
// Falls back to import.meta.env for local Vite-only dev setups.
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: { VITE_CLERK_PUBLISHABLE_KEY?: string };
  }
}
const PUBLISHABLE_KEY =
  window.__RUNTIME_CONFIG__?.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  // Render a visible error instead of a blank white screen
  document.getElementById("root")!.innerHTML =
    '<div style="font-family:sans-serif;padding:2rem;color:#c00">' +
    '<h2>Configuration error</h2>' +
    '<p>VITE_CLERK_PUBLISHABLE_KEY is not set. ' +
    'Please add it in Settings → Secrets and redeploy.</p>' +
    '</div>';
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

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

  // With Clerk, unauthenticated users are redirected by the ClerkProvider/SignedOut gate.
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
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignInUrl="/" afterSignUpUrl="/">
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  </HelmetProvider>
);
