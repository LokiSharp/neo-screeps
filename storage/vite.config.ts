import { defineConfig } from 'vite'
import { resolve } from "node:path";
import * as path from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "cjs"],
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  optimizeDeps: { disabled: true },
  plugins: [
    dts({
      rollupTypes: true
    })
  ]
})
