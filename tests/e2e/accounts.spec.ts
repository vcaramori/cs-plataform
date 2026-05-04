import { test, expect } from '@playwright/test';

test.describe('Epic 2: Accounts (LOGOs)', () => {

  test('Story 2.1: Redirecionamento da Lista de Contas para o Dashboard', async ({ page }) => {
    // Como decidido na arquitetura, a rota /accounts redireciona para a visão consolidada do Dashboard
    await page.goto('/accounts');
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.getByText('Portfólio de LOGOS')).toBeVisible();
  });

  // O teste da Story 2.2 exige o carregamento da página de detalhes.
  // Vamos navegar até o dashboard e clicar no primeiro item da tabela se existir.
  test('Story 2.2: Detalhes da Conta - Elementos de Governança e Saúde', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tenta encontrar a primeira linha da tabela
    const firstAccountRow = page.locator('table tbody tr').first();
    
    // Se a tabela tiver dados, clicamos na linha para abrir os detalhes
    if (await firstAccountRow.isVisible()) {
      await firstAccountRow.click();
      
      // Verifica se a URL mudou para /accounts/[id]
      await expect(page).toHaveURL(/.*\/accounts\/.+/);
      
      // Verifica os pilares da página de detalhes
      await expect(page.getByText('Linha do Tempo')).toBeVisible();
      await expect(page.getByText('Success Plan')).toBeVisible();
      await expect(page.getByText('Adoção Executiva')).toBeVisible();
      await expect(page.getByText('Mapeamento de Poder')).toBeVisible();
      await expect(page.getByText('Governança')).toBeVisible();
    }
  });

});
