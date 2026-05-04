import { test, expect } from '@playwright/test';

test.describe('Epic 4: Suporte (Gestão de Tickets)', () => {
  test('Story 4.1: Deve carregar o painel de suporte e tickets', async ({ page }) => {
    await page.goto('/suporte');
    
    // Verifica elementos base do módulo de suporte
    await expect(page.getByText('Support Operations', { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder('Buscar tickets...')).toBeVisible();
    
    // Verifica botões de criação e abas
    await expect(page.getByRole('button', { name: /novo ticket/i })).toBeVisible();
  });
});
