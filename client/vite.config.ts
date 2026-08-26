import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies /api to the Express backend so the client can call same-origin
// relative paths in dev — no CORS configuration needed either side.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
