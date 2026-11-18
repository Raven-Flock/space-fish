import { defineConfig } from "vite";

// The repo root is what GitHub Pages serves (legacy Pages from main /). The editable
// source lives in src/ and builds to dist/; `npm run build` never writes to the root.
// Publishing a build to the root (as 1c9c028 did by hand) is a separate, Sean-approved step.
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
