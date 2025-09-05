import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';

test.describe('Admin Users CRUD Complete', () => {
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

  test('should navigate to Admin and verify page elements', async ({ page }) => {
    await test.step('Navigate to Admin and verify page', async () => {
      await adminUsersPage.gotoAdmin();
      expect(await adminUsersPage.isOnPage()).toBeTruthy();
      await expect(page).toHaveURL(/\/admin\//);
      await adminUsersPage.verifyPageLoaded();
    });

    await test.step('Verify page elements are accessible', async () => {
      // Verify URL and page state
      await expect(page).toHaveURL(/\/admin\//);
      expect(await adminUsersPage.isOnPage()).toBeTruthy();
      
      // Verify key page elements
      await expect(adminUsersPage.systemUsersHeading).toBeVisible();
      await expect(adminUsersPage.addButton).toBeVisible();
      await expect(adminUsersPage.searchButton).toBeVisible();
      await expect(adminUsersPage.resetButton).toBeVisible();
    });
  });

  test('should handle search and reset functionality', async ({ page }) => {
    await test.step('Navigate to Admin page', async () => {
      await adminUsersPage.gotoAdmin();
      expect(await adminUsersPage.isOnPage()).toBeTruthy();
    });

    await test.step('Search for existing Admin user', async () => {
      await adminUsersPage.search('Admin');
      expect(await adminUsersPage.tableHasUser('Admin')).toBeTruthy();
    });

    await test.step('Reset search and verify grid returns to initial state', async () => {
      await adminUsersPage.resetSearch();
      
      // Verify we're back to the main admin page with all users
      await expect(page).toHaveURL(/\/admin\//);
      
      // Wait for table to be populated after reset
      await adminUsersPage.usersTable.waitFor({ state: 'visible' });
      
      // Wait a bit more for data to load
      await page.waitForTimeout(3000);
      
      // Verify table has users (at least the Admin user should be visible)
      const userCount = await adminUsersPage.tableRows.count();
      expect(userCount).toBeGreaterThanOrEqual(1);
      
      // Verify Admin user is visible after reset
      expect(await adminUsersPage.tableHasUser('Admin')).toBeTruthy();
    });
  });

  test('should open Add User form and verify form elements', async ({ page }) => {
    await test.step('Navigate to Admin', async () => {
      await adminUsersPage.gotoAdmin();
      await adminUsersPage.verifyPageLoaded();
    });

    await test.step('Open Add User form', async () => {
      await adminUsersPage.openAddUser();
      
      // Verify basic form elements are visible
      await expect(adminUsersPage.employeeNameInput).toBeVisible();
      await expect(adminUsersPage.usernameInput).toBeVisible();
      await expect(adminUsersPage.passwordInput).toBeVisible();
      await expect(adminUsersPage.confirmPasswordInput).toBeVisible();
      await expect(adminUsersPage.saveButton).toBeVisible();
    });
  });
});