import { QueryCache, QueryClient } from "react-query";
import { useToasts } from "../util/toasts";
import { APIError } from "./queries";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof APIError) {
        if (err.status !== 401) {
          useToasts.getState().create({
            type: "error",
            title: `API Error (${err.status})`,
            message: err.message,
          });
        }
      } else {
        useToasts.getState().create({
          type: "error",
          title: "Unexpect API error",
          message: `${err}`,
        });
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, err: any) => {
        if (failureCount >= 3) {
          return false;
        }
        return err.status >= 500;
      },
      staleTime: 1000 * 60 * 3,
    },
  },
});

export default queryClient;

// This is only used in Discord Activities to work around the lack of cookies
// We don't need to persist the token at all because we re-authenticate for every Activity session
let localSessionToken: string;

export function setLocalSessionToken(token: string) {
  localSessionToken = token;
}

/**
 * SPLIT-HOSTING: The backend URL is injected at build time via VITE_API_BASE_URL.
 *
 * Local dev  → leave VITE_API_BASE_URL empty; Vite proxy handles /api → localhost:8080
 * Production → set VITE_API_BASE_URL=https://your-backend.railway.app (no trailing slash)
 *
 * This allows the frontend (Vercel/Netlify) and backend (Railway/Render) to live
 * on completely separate domains.
 */
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

export function fetchApi(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const headers = (init?.headers || {}) as Record<string, string>;
  if (localSessionToken) {
    headers.Authorization = localSessionToken;
  }

  // Prepend the backend base URL when running on a separate domain
  const url =
    API_BASE_URL && typeof input === "string"
      ? `${API_BASE_URL}${input}`
      : input;

  return fetch(url, {
    ...init,
    // credentials: "include" is required so the browser sends session cookies
    // cross-origin (from Vercel → Railway, for example)
    credentials: API_BASE_URL ? "include" : "same-origin",
    headers,
  });
}
