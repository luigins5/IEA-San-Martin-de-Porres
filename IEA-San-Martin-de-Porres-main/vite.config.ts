import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Warn if critical keys are missing in production build
  if (mode === 'production' && !env.API_KEY) {
    console.warn("⚠️  WARNING: API_KEY is not defined in environment variables.");
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
    server: {
      port: 3000,
    },
  };
});