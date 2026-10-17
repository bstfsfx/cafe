import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  appType: 'custom',
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['3000-i79qk81jujs2eoutf0zvr-b8cf6522.sg2.manus.computer'],
  },
});
