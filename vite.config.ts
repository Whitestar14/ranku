import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  css: {
    transformer: "postcss",
  },
  build: {
    target: "esnext",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "motion",
              test: /node_modules[\\/](motion|framer-motion)[\\/]/,
            },
            { name: "dnd", test: /node_modules[\\/]@dnd-kit[\\/]/ },
            { name: "export", test: /node_modules[\\/]html-to-image[\\/]/ },
          ],
        },
      },
    },
  },
});
