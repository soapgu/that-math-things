import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  base: '/that-math-things/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'build',
    // Ant Design 基础运行时和按需注册后的 ECharts 各自约 550 kB；二者均为独立缓存块。
    chunkSizeWarningLimit: 600,
  },
  server: {
    open: '/that-math-things/',
  },
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
