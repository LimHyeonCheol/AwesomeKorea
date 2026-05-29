import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const LOCAL_API_PROXY_TARGET =
  process.env.AWESOMEKOREA_API_PROXY_TARGET ?? "http://127.0.0.1:9000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": LOCAL_API_PROXY_TARGET,
      "/internal": LOCAL_API_PROXY_TARGET,
    },
  },
});
