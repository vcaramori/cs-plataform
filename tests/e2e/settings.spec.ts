import { test, expect } from '@playwright/test';

test.describe('Epic 7 & 8: Settings e Users', () => {
  test('Story 7.1: Deve carregar as configurações globais', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('System Configuration', { exact: false })).toBeVisible();
  });

  test('Story 8.2: Deve carregar o painel de gestão de equipe (Users)', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Team & Access', { exact: false })).toBeVisible();
  });
});
