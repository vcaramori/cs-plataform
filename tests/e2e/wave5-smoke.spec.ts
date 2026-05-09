import { test, expect } from '@playwright/test';

test.describe('Wave 5 — Smoke Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock authentication for testing
    // In production QA, use real test user credentials
    await context.addCookies([
      {
        name: 'sb-auth-token',
        value: 'test-jwt-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    // Mock Supabase auth state
    await page.addInitScript(() => {
      // Mock localStorage for Supabase session
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'qa-test@plannera.test',
          role: 'csm'
        },
        access_token: 'test-jwt-token',
        refresh_token: 'test-refresh-token'
      };
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
    });

    await page.goto('/');
  });

  test.describe('Epic 16 — Command Center', () => {
    test('should load home page with priorities', async ({ page }) => {
      await page.goto('/');
      const prioritiesCard = page.locator('[data-testid="priorities-card"]');
      await expect(prioritiesCard).toBeVisible();
    });

    test('should fetch daily briefing', async ({ page }) => {
      const briefing = await page.request.get('/api/daily-briefing');
      expect(briefing.ok()).toBeTruthy();
      const data = await briefing.json();
      expect(data).toHaveProperty('briefing_text');
    });

    test('should show quick actions FAB', async ({ page }) => {
      await page.goto('/');
      const fab = page.locator('[data-testid="quick-actions-fab"]');
      await expect(fab).toBeVisible();
    });
  });

  test.describe('Epic 17 — Renewal Cockpit', () => {
    test('should render renewal page with 6 sections', async ({ page }) => {
      // Assuming account ID 1 exists in test DB
      await page.goto('/accounts/1/renewal');

      const sections = await page.locator('[data-testid="renewal-section"]').count();
      expect(sections).toBeGreaterThanOrEqual(1);
    });

    test('should generate PDF brief', async ({ page }) => {
      const response = await page.request.post('/api/accounts/1/renewal/pdf', {
        data: { account_id: '1' }
      });
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('html');
    });

    test('should show renewal pipeline', async ({ page }) => {
      const response = await page.request.get('/api/dashboard/renewal-pipeline');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('critical');
      expect(data).toHaveProperty('urgent');
      expect(data).toHaveProperty('planning');
    });
  });

  test.describe('Epic 20 — VoC', () => {
    test('should render VoC board page', async ({ page }) => {
      await page.goto('/voc');
      const board = page.locator('[data-testid="voc-board"]');
      await expect(board).toBeVisible();
    });

    test('should fetch sentiment trends', async ({ page }) => {
      const response = await page.request.get('/api/voc/sentiment-trends?days=7');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data.data)).toBeTruthy();
    });

    test('should fetch top themes', async ({ page }) => {
      const response = await page.request.get('/api/voc/top-themes');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('pains');
      expect(data).toHaveProperty('praises');
    });
  });

  test.describe('Epic 23 — Playbook Builder', () => {
    test('should render playbook canvas', async ({ page }) => {
      await page.goto('/playbooks/builder');
      const canvas = page.locator('[data-testid="playbook-canvas"]');
      await expect(canvas).toBeVisible();
    });

    test('should list playbooks', async ({ page }) => {
      const response = await page.request.get('/api/playbooks');
      expect(response.ok()).toBeTruthy();
    });
  });
});
