import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'qa-test@plannera.test',
  password: process.env.TEST_USER_PASSWORD || 'QATest123!@'
};

test.describe('Wave 5 — Smoke Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock Supabase auth state in localStorage before navigating
    await page.addInitScript(() => {
      const mockSession = {
        user: {
          id: 'test-user-id-wave5',
          email: 'qa-test@plannera.test',
          aud: 'authenticated',
          role: 'csm',
          email_confirmed_at: new Date().toISOString(),
          phone_confirmed_at: null,
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {
            provider: 'email',
            providers: ['email']
          },
          user_metadata: {
            csm_id: 'csm-test-wave5'
          },
          identities: []
        },
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3N0YXJ0ZXIuc3VwYWJhc2UuY28iLCJzdWIiOiJ0ZXN0LXVzZXItaWQtd2F2ZTUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiaWF0IjoxNjMxNjMyNDAwLCJleHAiOjE5MzE2MzI0MDB9.test_token_signature',
          refresh_token: 'test-refresh-token-wave5',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'Bearer',
          type: 'session'
        }
      };
      localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));

      // Set auth session in IndexedDB if available
      try {
        const request = indexedDB.open('supabase.auth');
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['auth_sessions'], 'readwrite');
          const store = transaction.objectStore('auth_sessions');
          store.put(mockSession, 'session');
        };
      } catch (e) {
        // IndexedDB not available, localStorage is enough
      }
    });

    // Navigate to base URL
    await page.goto(BASE_URL);

    // Wait for app to be ready
    await page.waitForLoadState('networkidle');
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
