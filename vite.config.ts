import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel serves the app at the domain root; GitHub Pages uses /cstudio/.
export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? "/" : "/cstudio/"
});
