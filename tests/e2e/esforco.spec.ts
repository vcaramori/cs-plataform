import { test, expect } from '@playwright/test';

test.describe('Epic 6: Esforço & Time Tracking', () => {
  test('Story 6.1: Deve carregar o painel de lançamento de horas', async ({ page }) => {
    await page.goto('/esforco');
    
    // Verifica elementos base do módulo de esforço
    await expect(page.getByText('Resource Allocation', { exact: false })).toBeVisible();
    await expect(page.getByText('Novo Lançamento', { exact: false })).toBeVisible();
  });
});
