import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Functionality', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Verify we're on the login page
    await loginPage.verifyLoginPageLoaded();

    // Perform login using environment credentials
    await loginPage.loginWithEnvCredentials();

    // Verify dashboard is visible after successful login
    await loginPage.verifyDashboardVisible();

    // Additional verification: check that we're not on login page anymore
    expect(page.url()).not.toContain('/auth/login');
  });

  test('should display error for invalid credentials', async ({ page }) => {
    // Verify we're on the login page
    await loginPage.verifyLoginPageLoaded();

    // Try to login with invalid credentials
    await loginPage.login('Admin', 'senha_errada');

    // Verify error message is displayed (no dashboard wait)
    await loginPage.verifyErrorDisplayed();
  });

  test('should validate required fields', async ({ page }) => {
    // Verify we're on the login page
    await loginPage.verifyLoginPageLoaded();

    // Try to submit empty form
    await loginPage.submitButton.click();

    // Verify we're still on login page (form validation prevented submission)
    expect(page.url()).toContain('/login');

    // TODO: Add specific validation message checks based on your app
    // Example: await expect(page.locator('.field-error')).toBeVisible();
  });

  test('should have all required elements visible', async ({ page }) => {
    // Verify all login form elements are present
    await loginPage.verifyLoginPageLoaded();
    
    // Additional checks
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    
    // Verify submit button is enabled
    expect(await loginPage.isSubmitButtonEnabled()).toBe(true);
  });

  test('should navigate to login page successfully', async ({ page }) => {
    // Verify page loaded correctly
    await loginPage.verifyLoginPageLoaded();
    
    // Verify URL contains auth/login path
    await expect(page).toHaveURL(/.*\/auth\/login/);
    
    // Verify page title matches OrangeHRM
    const title = await page.title();
    expect(title.toLowerCase()).toContain("orangehrm");
    
    // Additional robust check: username input is visible
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });
});