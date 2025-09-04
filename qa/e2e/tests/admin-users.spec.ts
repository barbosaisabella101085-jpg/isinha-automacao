import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';

test.describe('Admin Users Management', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;
  let adminUsersPage: AdminUsersPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    adminUsersPage = new AdminUsersPage(page);

    // Login before each test
    await loginPage.goto();
    await loginPage.verifyLoginPageLoaded();
    await loginPage.login(process.env.USER_EMAIL!, process.env.USER_PASS!);
    await dashboardPage.assertLoggedIn();
  });

  test('should verify admin users page elements are accessible', async ({ page }) => {
    await adminUsersPage.goto();
    
    // Verify page loaded correctly
    await adminUsersPage.verifyAdminUsersPageLoaded();
    
    // Verify URL contains admin path
    await expect(page).toHaveURL(/.*\/admin/);
    
    // Verify key elements are visible
    await expect(adminUsersPage.addButton).toBeVisible();
    await expect(adminUsersPage.searchButton).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    await adminUsersPage.goto();

    await test.step('Search for existing user', async () => {
      // Search for the Admin user (should always exist in demo)
      await adminUsersPage.search('Admin');
      
      // Verify Admin user appears in results
      await adminUsersPage.assertUserRow('Admin');
    });

    await test.step('Clear search results', async () => {
      await adminUsersPage.clearSearch();
      
      // Verify page reloaded after clearing search
      await expect(page).toHaveURL(/.*\/admin/);
    });
  });
});