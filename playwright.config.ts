import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: '**/*.spec.ts', use: { baseURL: 'http://localhost:3100' }, webServer: { command: 'npm run start -- --port 3100', url: 'http://localhost:3100', reuseExistingServer: false } });
