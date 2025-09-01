import { Page, Locator, expect } from '@playwright/test';

/**
 * Base page class containing common functionality for all page objects
 * Provides reusable methods for navigation, waiting, and common assertions
 * 
 * Important: All navigation methods use relative paths that are automatically
 * combined with the BASE_URL configured in playwright.config.ts from .env file
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific path relative to the base URL
   * The path will be automatically combined with BASE_URL from .env file
   * @param path - The path to navigate to (e.g., '/login', '/dashboard')
   * @example await this.goto('/login') // Goes to BASE_URL + '/login'
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for the page to be loaded (network idle)
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for an element to be visible
   * @param locator - The locator to wait for
   * @param timeout - Optional timeout (defaults to test config)
   */
  async waitForElement(locator: Locator, timeout?: number): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * Fill an input field and verify it was filled correctly
   * @param locator - The input locator
   * @param value - The value to fill
   */
  async fillAndVerify(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }

  /**
   * Click an element and wait for navigation if expected
   * @param locator - The element to click
   * @param waitForNavigation - Whether to wait for navigation after click
   */
  async clickAndWait(locator: Locator, waitForNavigation: boolean = false): Promise<void> {
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForNavigation(),
        locator.click()
      ]);
    } else {
      await locator.click();
    }
  }

  /**
   * Get the current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get the current page URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Take a screenshot with a descriptive name
   * @param name - Name for the screenshot
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `./test-results/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for a specific URL pattern
   * @param urlPattern - The URL pattern to wait for
   */
  async waitForUrl(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern);
  }

  /**
   * Verify that an element is visible
   * @param locator - The element locator
   * @param message - Optional custom error message
   * @param timeoutMs - Optional timeout in milliseconds (default: 15000)
   */
  async expectVisible(locator: Locator, message?: string, timeoutMs: number = 15_000): Promise<void> {
    await expect(locator, message).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Verify that an element contains specific text
   * @param locator - The element locator
   * @param text - The expected text
   */
  async expectToContainText(locator: Locator, text: string): Promise<void> {
    await expect(locator).toContainText(text);
  }
}