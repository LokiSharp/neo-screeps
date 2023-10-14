import { defineConfig } from 'vite'
import * as path from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: './src/main.ts',
        runtime: './src/runtime/runtime-driver.ts'
      },
      output: {
        dir: 'dist',
        format: 'es',
        entryFileNames: '[name].js',
      }
    },
    minify: false,
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.join(__dirname, "src"),
    },
  },
  optimizeDeps: { disabled: true }
})
