import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0", // Expose port 3000 publicly as required
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000", // Express backend private port in dev
        changeOrigin: true,
      },
    },
  },
});
