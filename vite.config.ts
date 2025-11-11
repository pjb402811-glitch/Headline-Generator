import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This ensures that files at the root like sw.js and icons are copied to the build output.
    // While creating a `public` directory is the standard, this works for the current flat structure.
    assetsDir: '.',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})