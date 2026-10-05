import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: true,
      },
      plugins: [react()],
      optimizeDeps: {
        exclude: ['@dimforge/rapier3d-compat']
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'react': path.resolve(__dirname, 'node_modules/react'),
          'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
          '@react-three/fiber': path.resolve(__dirname, 'node_modules/@react-three/fiber'),
          '@react-three/drei': path.resolve(__dirname, 'node_modules/@react-three/drei'),
        }
      }
    };
});
