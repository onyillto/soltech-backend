import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API base URL is hardcoded (see src/api/client.ts) to the deployed
// backend, so every request — dev or prod — goes straight there; nothing
// here needs to proxy /api anymore.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
