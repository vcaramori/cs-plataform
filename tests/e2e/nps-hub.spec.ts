import { test, expect } from '@playwright/test';

test.describe('NPS Hub - Loyalty Intelligence', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/nps');
  });

  test('TC-NPS-01: Global Score Dashboard', async ({ page }) => {
    // Verifica o Mega-Card do NPS
    await expect(page.locator('text=NPS Global')).toBeVisible();
    
    // Verifica o gráfico de evolução (área translúcida)
    const chart = page.locator('.recharts-responsive-container');
    await expect(chart).toBeVisible();
  });

  test('TC-NPS-02: Filtros e Exportação', async ({ page }) => {
    // Testa o botão de exportar
    const exportButton = page.locator('button:has-text("Exportar"), button:has(.lucide-download)');
    await expect(exportButton).toBeVisible();
    
    // Testa a lista de respostas
    const feed = page.locator('text=Feedback em tempo real').or(page.locator('table'));
    await expect(feed).toBeVisible();
  });

  test('TC-NPS-03: Gestão de Programas', async ({ page }) => {
    // Navega para a gestão de programas
    await page.click('button:has-text("Gerenciar Programas"), a[href*="programs"]');
    await page.waitForURL('**/nps/programs');
    
    await expect(page.locator('h1')).toContainText('Programas');
    await expect(page.locator('button:has-text("Novo Programa")')).toBeVisible();
  });
});
