import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/that-math-things/',
  plugins: [react()],
  build: { outDir: 'build' },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setup-vitest.js',
    transformIgnorePatterns: [
      'node_modules/(?!(antd|@ant-design|@rc-component|rc-|@ant-design/icons|@ant-design/fast-color|@ant-design/colors)/)',
    ],
    moduleNameMapper: {
      '^@rc-component/([^/]+)/(locale|generate)/.+$': '<rootDir>/src/__mocks__/rcLocale.js',
    },
  },
});
