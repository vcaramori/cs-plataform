import { test, expect } from '@playwright/test';

test.describe('AI Smoke Test - CS-Continuum', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    // Espera o formulário carregar
    await page.waitForSelector('#email');
    await page.fill('#email', 'test@plannera.com.br');
    await page.fill('#password', 'Plannera@2026');
    await page.click('button[type="submit"]');
    
    // Aguarda o dashboard carregar
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('TC-AI-01: Esforço NLP Parsing', async ({ page }) => {
    await page.goto('http://localhost:3000/esforco');
    // Busca o textarea pelo placeholder exato ou parte dele
    const input = page.locator('textarea[placeholder*="Descreva o que foi feito"]');
    await input.fill('Passei 2h em reunião técnica com a APODI');
    
    // Clica no botão de registrar
    await page.click('button:has-text("REGISTRAR PRODUÇÃO")');
    
    // Verifica o toast de sucesso ou a presença na tabela
    await expect(page.locator('text=2h registrada')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table')).toContainText('APODI');
  });

  test('TC-AI-02: Perguntar (RAG)', async ({ page }) => {
    await page.goto('http://localhost:3000/perguntar');
    // Placeholder atualizado conforme PerguntarClient.tsx
    const input = page.locator('textarea[placeholder*="Consulte o conhecimento"]');
    await input.fill('Quais são as principais métricas da APODI?');
    
    // Clica no botão de enviar (ícone Send da lucide)
    await page.click('button:has(.lucide-send)');
    
    // Aguarda resposta da IA (buscando o container de resposta que usa prose)
    const response = page.locator('.prose, .markdown-content, div.text-sm.leading-relaxed');
    await expect(response.first()).toBeVisible({ timeout: 45000 });
  });

  test('TC-AI-03: Shadow Score Generation', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    // Clica no link ou célula que contém "APODI" para ir ao detalhe
    // Usa uma abordagem mais robusta para encontrar o link
    await page.getByRole('cell', { name: 'APODI' }).first().click(); 
    
    // Aguarda a página da conta carregar e busca o botão de IA (Sparkles)
    const aiButton = page.locator('button:has(.lucide-sparkles), button:has-text("✨")').first();
    await expect(aiButton).toBeVisible({ timeout: 20000 });
    await aiButton.click();
    
    // O Shadow Score gera um toast ao concluir
    await expect(page.locator('text=Shadow Score gerado')).toBeVisible({ timeout: 30000 });
  });

  test('TC-AI-04: Revisor de Resposta de Suporte', async ({ page }) => {
    await page.goto('http://localhost:3000/suporte');
    // Espera a tabela de tickets e clica na primeira linha
    await page.waitForSelector('table tr:nth-child(2)', { timeout: 15000 });
    await page.locator('table tr').nth(1).click();
    
    // Aguarda a navegação para a página do ticket
    await page.waitForURL('**/suporte/**', { timeout: 15000 });
    const replyArea = page.locator('textarea[placeholder*="Escreva sua resposta"]');
    await expect(replyArea).toBeVisible({ timeout: 10000 });
    await replyArea.fill('Oi cliente, estamos analisando seu caso com prioridade.');
    
    // Busca o botão de revisão (Sparkles ao lado do enviar)
    const reviewButton = page.locator('button:has(.lucide-sparkles), button:has-text("✨")').last();
    await reviewButton.click();
    
    // Verifica se o painel de revisão (Sugestão da IA) apareceu
    await expect(page.locator('text=Sugestão da IA')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=Tom')).toBeVisible();
  });
});
