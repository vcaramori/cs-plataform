import { test, expect } from '@playwright/test';

test.describe('Epic 9: Automação de Playbooks (Jornadas)', () => {
  test('Story 9.1: Deve carregar o painel central de templates de Playbooks', async ({ page }) => {
    await page.goto('/playbooks');
    
    // Verifica elementos base do módulo de playbooks
    await expect(page.getByText('Playbooks & Automação')).toBeVisible();
    await expect(page.getByRole('button', { name: /novo playbook/i })).toBeVisible();
  });
});
