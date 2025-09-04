import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface UserData {
  employeeName: string;
  username: string;
  password: string;
  role?: 'Admin' | 'ESS';
  status?: 'Enabled' | 'Disabled';
}

/**
 * Admin Users Page Object Model
 * Handles all interactions with Admin → User Management → Users page
 * 
 * Provides CRUD operations for user management in OrangeHRM
 * Follows the established Page Object Model patterns
 */
export class AdminUsersPage extends BasePage {
  // Navigation elements
  readonly adminMenu: Locator;
  readonly userManagementTab: Locator;
  readonly usersMenuItem: Locator;

  // Form elements for creating users
  readonly addButton: Locator;
  readonly employeeNameInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly roleDropdown: Locator;
  readonly statusDropdown: Locator;
  readonly saveButton: Locator;

  // Search and table elements
  readonly searchUsernameInput: Locator;
  readonly searchButton: Locator;
  readonly usersTable: Locator;
  readonly resetButton: Locator;

  // Success/feedback elements
  readonly successToast: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // Navigation selectors - robust OrangeHRM specific
    this.adminMenu = page.getByRole('link', { name: 'Admin' }).or(page.locator('a:has-text("Admin")')).first();
    this.userManagementTab = page.getByRole('tab', { name: 'User Management' }).or(page.getByText('User Management'));
    this.usersMenuItem = page.getByRole('link', { name: 'Users' }).or(page.getByText('Users', { exact: true }));

    // Form elements with more specific selectors for OrangeHRM
    this.addButton = page.getByRole('button', { name: /add/i }).first();
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.usernameInput = page.locator('.oxd-input').nth(1); // Second input after employee name
    this.passwordInput = page.locator('input[type="password"]').first();
    this.confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    this.saveButton = page.getByRole('button', { name: /save/i });

    // Dropdown selectors - more specific for OrangeHRM
    this.roleDropdown = page.locator('.oxd-select-text-input').first();
    this.statusDropdown = page.locator('.oxd-select-text-input').nth(1);

    // Search elements - target the search form specifically
    this.searchUsernameInput = page.locator('.oxd-form .oxd-input').first();
    this.searchButton = page.getByRole('button', { name: /search/i });
    this.resetButton = page.getByRole('button', { name: /reset/i });

    // Table and feedback
    this.usersTable = page.locator('.oxd-table-body, table tbody').first();
    this.successToast = page.locator('.oxd-toast--success, .toast-success').or(page.getByText(/successfully|success/i));
    this.deleteConfirmButton = page.getByRole('button', { name: /yes.*delete/i }).or(page.locator('button:has-text("Yes, Delete")'));
  }

  /**
   * Navigate to Admin → User Management → Users page
   */
  async goto(): Promise<void> {
    // Click Admin menu
    await this.adminMenu.click();
    
    // Wait for admin page to load
    await this.page.waitForURL(/admin/i, { timeout: 15000 });
    
    // Wait for the page elements to be visible
    await this.page.waitForTimeout(2000); // Allow page to stabilize
    
    // Verify we're on the admin page with user management
    await this.expectVisible(this.addButton, 'Add button should be visible on admin users page');
  }

  /**
   * Create a new user with the provided data
   * @param data - User data object containing required fields
   */
  async createUser(data: UserData): Promise<void> {
    const { employeeName, username, password, role = 'ESS', status = 'Enabled' } = data;

    // Click Add button to open create form
    await this.addButton.click();
    
    // Wait for form to be visible
    await this.page.waitForTimeout(3000); // Give time for form to load
    
    // Fill Employee Name and select from autocomplete
    await this.employeeNameInput.fill(employeeName);
    
    // Wait for autocomplete dropdown and select first option
    await this.page.waitForTimeout(2000);
    const autocompleteOption = this.page.locator('.oxd-autocomplete-option').first();
    await autocompleteOption.waitFor({ state: 'visible', timeout: 10000 });
    await autocompleteOption.click();

    // Fill Username - wait for field to be enabled
    await this.page.waitForTimeout(1000);
    await this.usernameInput.fill(username);

    // Select Role
    await this.roleDropdown.click();
    await this.page.waitForTimeout(1000);
    const roleOption = this.page.getByRole('option', { name: new RegExp(role, 'i') }).or(this.page.locator(`text=${role}`));
    await roleOption.click();

    // Select Status  
    await this.statusDropdown.click();
    await this.page.waitForTimeout(1000);
    const statusOption = this.page.getByRole('option', { name: new RegExp(status, 'i') }).or(this.page.locator(`text=${status}`));
    await statusOption.click();

    // Fill passwords
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);

    // Save the user
    await this.saveButton.click();

    // Wait for success confirmation
    await this.expectVisible(this.successToast, 'Success message should appear after creating user');
    
    // Wait for redirect back to users list
    await this.page.waitForURL(/admin/i, { timeout: 15000 });
  }

  /**
   * Search for a user by username
   * @param username - Username to search for
   */
  async search(username: string): Promise<void> {
    // Clear any existing search first
    await this.resetButton.click();
    await this.page.waitForTimeout(2000); // Wait for reset to complete

    // Fill search username in the first input field (search form)
    await this.searchUsernameInput.fill(username);
    await this.page.waitForTimeout(1000);

    // Click search button
    await this.searchButton.click();

    // Wait for search results to load
    await this.page.waitForTimeout(3000);
  }

  /**
   * Assert that a user row exists in the table
   * @param username - Username to verify in the table
   */
  async assertUserRow(username: string): Promise<void> {
    const userRow = this.page.getByRole('row', { name: new RegExp(`\\b${username}\\b`) });
    await this.expectVisible(userRow, `User row with username '${username}' should be visible in table`);
  }

  /**
   * Delete a user by username
   * @param username - Username of the user to delete
   */
  async deleteUser(username: string): Promise<void> {
    // First search for the user to ensure it's visible
    await this.search(username);
    
    // Find the user row
    const userRow = this.page.getByRole('row', { name: new RegExp(`\\b${username}\\b`) });
    await this.expectVisible(userRow, `User row with username '${username}' should be visible`);

    // Find and click delete button in the user row
    const deleteButton = userRow.getByRole('button').or(userRow.locator('.oxd-icon-button')).last();
    await deleteButton.click();

    // Confirm deletion
    await this.expectVisible(this.deleteConfirmButton, 'Delete confirmation button should be visible');
    await this.deleteConfirmButton.click();

    // Wait for success confirmation
    await this.expectVisible(this.successToast, 'Success message should appear after deleting user');
  }

  /**
   * Verify the admin users page is loaded
   */
  async verifyAdminUsersPageLoaded(): Promise<void> {
    await this.expectVisible(this.addButton, 'Add button should be visible');
    await this.expectVisible(this.searchButton, 'Search button should be visible');
    await this.expectVisible(this.usersTable, 'Users table should be visible');
  }

  /**
   * Get total number of user rows in the table
   */
  async getUserRowsCount(): Promise<number> {
    const rows = this.page.getByRole('row').filter({ hasText: /\w+/ }); // Filter out empty rows
    return await rows.count();
  }

  /**
   * Clear all search filters
   */
  async clearSearch(): Promise<void> {
    await this.resetButton.click();
    await this.page.waitForTimeout(1000);
  }
}