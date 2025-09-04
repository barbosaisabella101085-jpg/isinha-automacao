import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Logout Functionality', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    
    // Navigate to login page and perform login before each test
    await loginPage.goto();
    await loginPage.verifyLoginPageLoaded();
    await loginPage.loginWithEnvCredentials();
    await loginPage.verifyDashboardVisible();
  });

  test('should logout and redirect to login page', async ({ page }) => {
    // Verify we're on the dashboard page
    await dashboardPage.verifyDashboardLoaded();
    
    // Perform logout
    await dashboardPage.logout();
    
    // Verify logout was successful
    await dashboardPage.verifyLogoutSuccessful();
    
    // Additional verification: check URL contains login path
    expect(page.url()).toMatch(/\/auth\/login/);
    
    // Verify login page elements are visible after logout
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should have user dropdown accessible on dashboard', async ({ page }) => {
    // Verify we're on the dashboard page
    await dashboardPage.verifyDashboardLoaded();
    
    // Verify user dropdown is visible
    await expect(dashboardPage.userDropdown).toBeVisible();
    
    // Click dropdown to open menu
    await dashboardPage.userDropdown.click();
    
    // Verify logout option is visible in the dropdown
    await expect(dashboardPage.logoutOption).toBeVisible();
  });

  test('should maintain session until logout is clicked', async ({ page }) => {
    // Verify we're on the dashboard page
    await dashboardPage.verifyDashboardLoaded();
    
    // Navigate to different part of dashboard (refresh)
    await page.reload();
    
    // Verify we're still logged in and on dashboard
    await dashboardPage.verifyDashboardLoaded();
    expect(page.url()).toMatch(/\/dashboard/);
    
    // Verify dashboard title is present
    const dashboardTitle = await dashboardPage.getDashboardTitle();
    expect(dashboardTitle.toLowerCase()).toContain('dashboard');
  });

  test('should complete full login-logout cycle', async ({ page }) => {
    // Starting from already logged in state (from beforeEach)
    await dashboardPage.verifyDashboardLoaded();
    
    // Perform logout
    await dashboardPage.logout();
    await dashboardPage.verifyLogoutSuccessful();
    
    // Verify we can login again after logout
    await loginPage.verifyLoginPageLoaded();
    await loginPage.loginWithEnvCredentials();
    await loginPage.verifyDashboardVisible();
    
    // Verify we're back on dashboard
    await dashboardPage.verifyDashboardLoaded();
    expect(page.url()).toMatch(/\/dashboard/);
  });
});