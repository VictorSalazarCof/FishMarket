import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El dashboard se sirve como estático desde el propio backend G10 en
// producción (rutas relativas, mismo origen). En desarrollo (`vite dev`)
// se levanta en su propio puerto, así que las rutas /api y /ws se
// proxean al backend local para no depender de CORS.
const BACKEND_URL = process.env.G10_API_URL || "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: BACKEND_URL, changeOrigin: true },
      "/ws":  { target: BACKEND_URL, ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
