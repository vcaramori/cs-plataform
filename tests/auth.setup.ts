import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navega para o login usando o baseURL configurado
  await page.goto('/login');
  
  // Preenche credenciais (usando variáveis de ambiente com fallback para os dados de teste conhecidos)
  const email = process.env.TEST_USER_EMAIL || 'test@plannera.com.br';
  const password = process.env.TEST_USER_PASSWORD || 'Plannera@2026';

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // Aguarda o redirecionamento para o dashboard para confirmar sucesso
  await page.waitForURL('**/dashboard');
  await expect(page.locator('h1')).toBeVisible();

  // Salva o estado da sessão (cookies, localStorage)
  await page.context().storageState({ path: authFile });
});
