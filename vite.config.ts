import { defineConfig } from "vite";

// The repo root is still what GitHub Pages serves today (legacy Pages from main /).
// So the editable source lives in src/ and builds to dist/; nothing at the root changes.
export default defineConfig({
  root: "src",
  base: "./",
  publicDir: false,
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
  },
});
