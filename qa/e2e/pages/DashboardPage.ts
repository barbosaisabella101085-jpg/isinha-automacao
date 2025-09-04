import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object Model
 * Handles all interactions with the dashboard page including logout functionality
 * 
 * Requires successful login to access dashboard features
 * Provides logout functionality that redirects back to login page
 */
export class DashboardPage extends BasePage {
  // Page elements - OrangeHRM specific selectors for dashboard and logout
  readonly dashboardH6: Locator;
  readonly userDropdown: Locator;
  readonly logoutOption: Locator;
  readonly profileImage: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    super(page);
    
    // Initialize locators with robust OrangeHRM-specific selectors
    this.dashboardH6 = page.locator('h6.oxd-text--h6.oxd-topbar-header-breadcrumb-module, h6:has-text("Dashboard")');
    
    // User dropdown menu selectors (multiple fallbacks for robustness)
    this.userDropdown = page.locator('.oxd-userdropdown-tab, .user-dropdown, .dropdown-toggle').first();
    this.profileImage = page.locator('.oxd-userdropdown-img, .profile-img, img[alt*="profile"]').first();
    this.userMenu = page.locator('.oxd-dropdown-menu, .dropdown-menu').first();
    
    // Logout option in the dropdown menu
    this.logoutOption = page.locator('a:has-text("Logout"), .oxd-userdropdown-link:has-text("Logout")').first();
  }

  /**
   * Navigate to the dashboard page
   * Note: Usually reached after successful login
   */
  async goto(): Promise<void> {
    await super.goto('/web/index.php/dashboard/index');
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to be fully loaded
   */
  async waitForDashboardLoad(): Promise<void> {
    await this.page.waitForURL(/\/dashboard/i, { timeout: 15000 });
    await this.expectVisible(this.dashboardH6, 'Dashboard heading should be visible');
  }

  /**
   * Verify that we are on the dashboard page
   */
  async verifyDashboardLoaded(): Promise<void> {
    await this.expectVisible(this.dashboardH6, 'Dashboard heading should be visible');
    await this.expectVisible(this.userDropdown, 'User dropdown should be visible');
  }

  /**
   * Perform logout operation
   * Clicks user dropdown and selects logout option
   */
  async logout(): Promise<void> {
    // Wait for dashboard to be fully loaded first
    await this.waitForDashboardLoad();

    // Click on user dropdown to open the menu
    await this.userDropdown.click();

    // Wait for dropdown menu to be visible
    await this.expectVisible(this.logoutOption, 'Logout option should be visible in dropdown');

    // Click logout option
    await this.logoutOption.click();

    // Wait for navigation to login page
    await this.page.waitForURL(/\/auth\/login/i, { timeout: 15000 });
  }

  /**
   * Verify logout was successful by checking we're back on login page
   */
  async verifyLogoutSuccessful(): Promise<void> {
    // Verify URL contains login path
    await this.page.waitForURL(/\/auth\/login/i, { timeout: 15000 });
    
    // Verify login page elements are visible
    const usernameInput = this.page.locator('input[name="username"], input[placeholder="Username"]');
    const passwordInput = this.page.locator('input[name="password"], input[placeholder="Password"]');
    
    await this.expectVisible(usernameInput, 'Username input should be visible after logout');
    await this.expectVisible(passwordInput, 'Password input should be visible after logout');
  }

  /**
   * Check if user dropdown menu is open
   */
  async isUserMenuOpen(): Promise<boolean> {
    return await this.userMenu.isVisible();
  }

  /**
   * Get the dashboard page title
   */
  async getDashboardTitle(): Promise<string> {
    return await this.dashboardH6.textContent() || '';
  }
}