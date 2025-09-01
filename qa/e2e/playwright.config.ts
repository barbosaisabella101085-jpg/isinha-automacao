import { defineConfig } from '@playwright/test';
import path from 'path';
import * as dotenv from 'dotenv';

// Carrega .env da raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Fail fast se BASE_URL não vier do .env
if (!process.env.BASE_URL) {
  throw new Error('[Playwright] BASE_URL não definida no .env da raiz.');
}

if (!process.env.USER_EMAIL || !process.env.USER_PASS) {
  console.warn(
    'Warning: USER_EMAIL and USER_PASS should be set in .env file for login tests to work properly.'
  );
}

export default defineConfig({
  testDir: path.resolve(__dirname, './tests'),
  timeout: 30_000,
  expect: { timeout: 15_000 },

  // Relatórios úteis no dia a dia
  reporter: [['list'], ['html', { outputFolder: path.resolve(__dirname, './report'), open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL, // sem fallback
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  // Projetos habilitados para permitir --project=chromium
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox',  use: { browserName: 'firefox'  } },
    { name: 'webkit',   use: { browserName: 'webkit'   } },
  ],

  retries: 1, // opcional, dá resiliência
  workers: undefined, // usa padrão por máquina
});