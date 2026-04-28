import { test, expect } from '@playwright/test';

/**
 * AI Features E2E Suite
 * Reutiliza a sessão autenticada do auth.setup.ts
 */
test.describe('AI Features - CS-Continuum', () => {
  
  test('TC-AI-01: Esforço NLP Parsing', async ({ page }) => {
    await page.goto('/esforco');
    
    const input = page.locator('textarea[placeholder*="Descreva o que foi feito"]');
    await input.fill('Passei 2h em reunião técnica com a APODI');
    
    await page.click('button:has-text("REGISTRAR PRODUÇÃO")');
    
    // Verificamos o feedback visual (toast ou inclusão na tabela)
    await expect(page.locator('text=2h registrada').or(page.locator('table'))).toBeVisible({ timeout: 15000 });
    await expect(page.locator('table')).toContainText('APODI');
  });

  test('TC-AI-02: Perguntar (RAG) - Resposta Contextual', async ({ page }) => {
    await page.goto('/perguntar');
    
    const input = page.locator('textarea[placeholder*="Consulte o conhecimento"]');
    await input.fill('Quais são as principais métricas da APODI?');
    
    // Clique no botão de envio
    await page.click('button:has(.lucide-send)');
    
    // Resposta deve conter o nome do cliente ou termos técnicos
    const responseContainer = page.locator('.prose, .markdown-content, div.text-sm.leading-relaxed').first();
    await expect(responseContainer).toBeVisible({ timeout: 45000 });
    
    // Verificamos se há menção a fontes ou contexto
    await expect(page.locator('text=Fontes').or(page.locator('text=APODI'))).toBeVisible();
  });

  test('TC-AI-03: Shadow Score Generation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Localiza a conta APODI na tabela
    const accountRow = page.getByRole('cell', { name: 'APODI' }).first();
    await accountRow.click(); 
    
    // Verifica presença do botão de IA
    const aiButton = page.locator('button:has(.lucide-sparkles), button:has-text("✨")').first();
    await expect(aiButton).toBeVisible({ timeout: 20000 });
    await aiButton.click();
    
    // Sucesso é confirmado pelo toast
    await expect(page.locator('text=Shadow Score gerado')).toBeVisible({ timeout: 30000 });
  });

  test('TC-AI-04: Revisor de Resposta de Suporte', async ({ page }) => {
    await page.goto('/suporte');
    
    // Seleciona o primeiro ticket da lista
    await page.waitForSelector('table tr:nth-child(2)', { timeout: 15000 });
    await page.locator('table tr').nth(1).click();
    
    // Preenche rascunho
    const replyArea = page.locator('textarea[placeholder*="Escreva sua resposta"]');
    await expect(replyArea).toBeVisible({ timeout: 10000 });
    await replyArea.fill('Oi cliente, estamos analisando seu caso com prioridade.');
    
    // Aciona a revisão por IA
    const reviewButton = page.locator('button:has(.lucide-sparkles), button:has-text("✨")').last();
    await reviewButton.click();
    
    // Valida o modal de revisão
    await expect(page.locator('text=Sugestão da IA')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=Média Harmônica').or(page.locator('text=Tom'))).toBeVisible();
  });
});
