import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // In development (no VITE_API_BASE_URL set) we proxy /api and /e to the
  // local Go backend.  In production the frontend calls the remote backend
  // directly using VITE_API_BASE_URL, so no proxy is needed there.
  const isDev = !env.VITE_API_BASE_URL;

  return defineConfig({
    plugins: [react()],
    base: env.VITE_DISCORD_ACTIVITY === "true" ? undefined : "/app",
    server: {
      // Proxy only in dev mode — in production the backend is on a different host
      proxy: isDev
        ? {
            "/api": {
              target: "http://127.0.0.1:8080",
              changeOrigin: true,
            },
            "/e": {
              target: "http://127.0.0.1:8080",
              changeOrigin: true,
            },
          }
        : undefined,
      base: "/app/",
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
        },
      },
    },
    // Expose VITE_API_BASE_URL to the client bundle
    define: {
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL || ""),
    },
  });
};
