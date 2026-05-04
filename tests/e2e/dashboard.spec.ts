import { test, expect } from '@playwright/test';

test.describe('Dashboard - KPI Strip', () => {
  test('deve renderizar todos os cards de métricas (Story 1.1)', async ({ page }) => {
    // Acessa o dashboard
    await page.goto('/dashboard');

    // Verifica se o cabeçalho do módulo carregou
    await expect(page.getByText('Portfolio Control')).toBeVisible();

    // Verifica os 6 cards de KPI
    await expect(page.getByText('TOTAL DE LOGOS', { exact: true })).toBeVisible();
    await expect(page.getByText('MRR TOTAL (R$)', { exact: true })).toBeVisible();
    await expect(page.getByText('HEALTH MÉDIO', { exact: true })).toBeVisible();
    await expect(page.getByText('LOGOS EM RISCO', { exact: true })).toBeVisible();
    await expect(page.getByText('RENOVAÇÕES (30D)', { exact: true })).toBeVisible();
    await expect(page.getByText('NPS SCORE', { exact: true })).toBeVisible();
  });

  test('deve renderizar a tabela de contas e seus filtros (Story 1.2)', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verifica título da tabela
    await expect(page.getByText('Portfólio de LOGOS')).toBeVisible();
    
    // Verifica campo de busca
    await expect(page.getByPlaceholder('Buscar cliente...')).toBeVisible();
    
    // Verifica botões de filtro de segmento
    await expect(page.getByText('Tudo', { exact: true })).toBeVisible();
    await expect(page.getByText('Indústria', { exact: true })).toBeVisible();
    await expect(page.getByText('MRO', { exact: true })).toBeVisible();
    await expect(page.getByText('Varejo', { exact: true })).toBeVisible();
    
    // Verifica colunas principais da tabela
    await expect(page.getByRole('columnheader', { name: 'Cliente' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'MRR' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Saúde' })).toBeVisible();
  });
});
