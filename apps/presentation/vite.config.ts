import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Todo (JS, CSS, datos y GeoJSON) queda dentro de dist/index.html.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: "./",
  build: { target: "es2022", chunkSizeWarningLimit: 2000 },
});
