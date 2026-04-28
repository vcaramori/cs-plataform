import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Carrega variáveis de ambiente do .env
dotenv.config();

export default defineConfig({
  testDir: './tests',
  /* Execução em paralelo para velocidade */
  fullyParallel: true,
  /* Falha o build no CI se houver um .only no código */
  forbidOnly: !!process.env.CI,
  /* Retry apenas no CI */
  retries: process.env.CI ? 2 : 0,
  /* Opt-out de execução paralela em máquinas locais se desejar */
  workers: process.env.CI ? 1 : undefined,
  /* Repórter focado em legibilidade */
  reporter: 'html',
  
  use: {
    /* Base URL do servidor local */
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

    /* Coleta de trace em caso de falha */
    trace: 'on-first-retry',
    
    /* Screenshot em caso de falha */
    screenshot: 'only-on-failure',

    /* Video em caso de falha */
    video: 'on-first-retry',
  },

  /* Configuração de projetos (Browsers) */
  projects: [
    /* Setup de autenticação para evitar login em cada teste */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Reutiliza o estado de autenticação
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Servidor web local para os testes */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
