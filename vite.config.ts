import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { adminApi } from "./scripts/admin-api.mjs";

export default defineConfig({
  base: "/",
  server: {
    host: true,
    port: 5173,
  },
  plugins: [react(), adminApi()],
});
