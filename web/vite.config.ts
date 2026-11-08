import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' }, // amazon-cognito-identity-js expects Node's global
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
