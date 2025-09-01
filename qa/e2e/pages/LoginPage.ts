import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object Model
 * Handles all interactions with the login page
 * 
 * Requires the following environment variables in .env:
 * - BASE_URL: Base URL of the application (used for navigation)
 * - USER_EMAIL: Test user email for login
 * - USER_PASS: Test user password for login
 */
export class LoginPage extends BasePage {
  // Page elements - OrangeHRM specific selectors
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly dashboardH6: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators with robust OrangeHRM-specific selectors
    this.emailInput = page.locator('input[name="username"], input[placeholder="Username"]');
    this.passwordInput = page.locator('input[name="password"], input[placeholder="Password"]');
    this.submitButton = page.getByRole('button', { name: /login/i }).or(page.locator('button[type="submit"]'));
    this.errorMessage = page.locator('.oxd-alert-content-text, .oxd-input-field-error-message, .alert-danger, .error');
    this.dashboardH6 = page.locator('h6.oxd-text--h6.oxd-topbar-header-breadcrumb-module, h6:has-text("Dashboard")');
    this.forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("Esqueci")');
  }

  /**
   * Navigate to the login page
   * Uses robust navigation that handles OrangeHRM redirects
   * @example Opens root URL and waits for redirect to login page
   */
  async goto(): Promise<void> {
    // abra a raiz — o OrangeHRM redireciona para /web/index.php/auth/login
    await super.goto('/');

    // aguarde o redirect e a URL de login ficar presente
    await this.page.waitForURL(/\/auth\/login/i, { timeout: 15000 });

    // aguarde o input de username ficar visível (evita flakiness)
    await this.emailInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Perform login with email and password
   * @param email - User email
   * @param password - User password
   */
  async login(email: string, password: string): Promise<void> {
    // Fill email field
    await this.emailInput.fill(email);
    
    // Fill password field
    await this.passwordInput.fill(password);
    
    // Click submit button
    await this.submitButton.click();
  }


  /**
   * Quick login using environment variables
   * Uses USER_EMAIL and USER_PASS from .env
   */
  async loginWithEnvCredentials(): Promise<void> {
    const email = process.env.USER_EMAIL;
    const password = process.env.USER_PASS;
    
    if (!email || !password) {
      throw new Error('USER_EMAIL and USER_PASS must be set in environment variables');
    }
    
    await this.login(email, password);
  }

  /**
   * Verify that we are on the login page
   */
  async verifyLoginPageLoaded(): Promise<void> {
    await this.expectVisible(this.emailInput, 'Username input should be visible');
    await this.expectVisible(this.passwordInput, 'Password input should be visible');
    await this.expectVisible(this.submitButton, 'Login button should be visible');
  }

  /**
   * Verify that login was successful by checking we're no longer on login page
   * This checks that URL has changed from /login to something else
   */
  async verifyLoginSuccessful(): Promise<void> {
    // Wait for navigation away from login page
    await this.page.waitForURL((url: URL) => !url.href.includes('/login'), {
      timeout: 10000
    });
  }

  /**
   * Verify that dashboard is visible after successful login
   */
  async verifyDashboardVisible(): Promise<void> {
    await this.page.waitForURL(/\/dashboard/i, { timeout: 15_000 });
    const dashboardHeading = this.page.locator(
      'h6.oxd-text--h6.oxd-topbar-header-breadcrumb-module, h6:has-text("Dashboard")'
    );
    await dashboardHeading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Verify that an error message is displayed
   * @param expectedMessage - Optional: specific error message to check for
   */
  async verifyErrorDisplayed(expectedMessage?: string): Promise<void> {
    await this.expectVisible(this.errorMessage, 'Error message should be displayed');
    
    if (expectedMessage) {
      await this.expectToContainText(this.errorMessage, expectedMessage);
    }
  }

  /**
   * Clear all form fields
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }
}