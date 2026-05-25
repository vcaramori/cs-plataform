import { test, expect } from '@playwright/test';

test.describe('Epic 4: Suporte (Gestão de Tickets)', () => {
  test.beforeEach(async ({}) => {
    test.setTimeout(60000); // Aumenta timeout total para tolerar compilação lenta do Next.js
  });

  test('Story 4.1: Deve carregar o painel de suporte e tickets', async ({ page }) => {
    await page.goto('/suporte', { timeout: 60000 });
    
    // Verifica elementos base do módulo de suporte
    await expect(page.getByText('Suporte & Chamados', { exact: false })).toBeVisible();
    await expect(page.getByPlaceholder('Buscar tickets...')).toBeVisible();
    
    // Verifica botões de criação e abas
    await expect(page.getByRole('button', { name: /novo ticket/i })).toBeVisible();
  });

  test('Story 4.2: Deve abrir modal, preencher formulário de ticket manual e criar com sucesso', async ({ page }) => {
    await page.goto('/suporte', { timeout: 60000 });

    // 1. Clicar no botão para abrir modal
    const openBtn = page.getByRole('button', { name: /novo ticket/i });
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // 2. Verificar que o modal abriu com título correto
    const modalTitle = page.getByText('Criar Chamado de Suporte Manual');
    await expect(modalTitle).toBeVisible();

    // 3. Selecionar o cliente (Conta) usando o SearchableSelect
    const clientTrigger = page.getByRole('combobox').filter({ hasText: 'Selecione o Cliente...' });
    await expect(clientTrigger).toBeVisible();
    await clientTrigger.click();

    // Digita ou clica na primeira opção de cliente disponível (Cristália)
    const firstOption = page.locator('[role="option"]').filter({ hasText: 'Cristália' }).first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    // 4. Aguardar carregar contatos/stakeholders e selecionar destinatário customizado
    await expect(page.getByText('Carregando contatos e stakeholders...')).not.toBeVisible({ timeout: 15000 });

    const recipientTrigger = page.locator('div.space-y-2').filter({ hasText: 'Notificar por E-mail (Destinatário)' }).locator('button[role="combobox"]');
    if (await recipientTrigger.isVisible()) {
      await recipientTrigger.click();
      const customOption = page.getByRole('option', { name: /digitar manualmente/i });
      await expect(customOption).toBeVisible();
      await customOption.click();
    }

    // Preenche o e-mail
    const emailInput = page.getByPlaceholder('exemplo@cliente.com');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    await emailInput.fill('suporte-cliente-e2e@plannera.com.br');

    // 5. Preencher Assunto/Título
    const titleInput = page.getByPlaceholder('Descreva brevemente o problema...');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Chamado de Teste E2E Criado Manualmente');

    // 6. Preencher Descrição
    const descInput = page.getByPlaceholder('Explique os detalhes do chamado para análise da equipe...');
    await expect(descInput).toBeVisible();
    await descInput.fill('Esta é uma descrição de teste para validar a criação manual de chamados com disparos e SLA.');

    // 7. Selecionar Prioridade Alta
    const highPriorityBtn = page.getByRole('button', { name: 'Alta' });
    await expect(highPriorityBtn).toBeVisible();
    await highPriorityBtn.click();

    // 8. Clicar em salvar
    const saveBtn = page.getByRole('button', { name: /criar chamado/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // 9. Validar que o modal fechou e o ticket foi inserido com sucesso
    await expect(modalTitle).not.toBeVisible({ timeout: 25000 });
  });
});
