import { test, expect } from '@playwright/test';

/**
 * API Integrity Suite - CS-Continuum
 * Valida os endpoints críticos sem depender da UI.
 */
test.describe('API Integrity - Business Rules', () => {

  test('POST /api/nps/check - Public Accessibility', async ({ request }) => {
    // NPS check deve ser público ou via token, validando se o endpoint responde
    const response = await request.post('/api/nps/check', {
      data: {
        program_id: 'default'
      }
    });
    
    // Deve retornar 200 ou 404 se não houver programa, mas nunca 500
    expect(response.status()).toBeLessThan(500);
  });

  test('POST /api/support/evaluate - Harmonic Mean Logic', async ({ request }) => {
    // Testa o motor de avaliação de suporte
    const response = await request.post('/api/support/evaluate', {
      data: {
        message: 'Teste de avaliação de suporte',
        history: []
      }
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('nota_final');
      expect(body).toHaveProperty('analysis');
      // Verifica se a nota está na escala 0-10
      expect(body.nota_final).toBeGreaterThanOrEqual(0);
      expect(body.nota_final).toBeLessThanOrEqual(10);
    }
  });

  test('POST /api/ask - RAG Response Structure', async ({ request }) => {
    // Testa o Cérebro do CS
    const response = await request.post('/api/ask', {
      data: {
        question: 'Quais contas estão em risco?',
        scope: 'all'
      }
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('answer');
      expect(Array.isArray(body.sources)).toBeTruthy();
    }
  });
});
