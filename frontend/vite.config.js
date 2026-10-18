import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the React app runs on http://localhost:5173 and the Spring Boot API on
// http://localhost:8080. Browsers block calls between different origins (CORS), so we let
// Vite forward every request starting with /api to Spring Boot. In the React code we then
// simply call "/api/..." with no host name, and no CORS configuration is needed in Spring.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
