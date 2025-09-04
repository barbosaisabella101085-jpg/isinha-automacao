import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface UserData {
  role: 'Admin' | 'ESS';
  status: 'Enabled' | 'Disabled';
  employeeName: string;
  username: string;
  password: string;
}

export interface EditUserData {
  role?: 'Admin' | 'ESS';
  status?: 'Enabled' | 'Disabled';
}

/**
 * Admin Users Page Object Model
 * Handles complete CRUD operations for Admin → User Management → Users page
 * 
 * Provides robust selectors with fallbacks for OrangeHRM interface
 * Follows the established Page Object Model patterns
 */
export class AdminUsersPage extends BasePage {
  // Navigation elements
  readonly adminMenuLink: Locator;
  readonly systemUsersHeading: Locator;

  // Action buttons
  readonly addButton: Locator;
  readonly saveButton: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly deleteButton: Locator;

  // Form elements for creating/editing users
  readonly userRoleDropdown: Locator;
  readonly employeeNameInput: Locator;
  readonly statusDropdown: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;

  // Search elements
  readonly searchUsernameInput: Locator;
  readonly searchForm: Locator;
  readonly addUserForm: Locator;

  // Table and results
  readonly usersTable: Locator;
  readonly tableRows: Locator;
  readonly noRecordsMessage: Locator;

  // Confirmation elements
  readonly deleteConfirmButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    super(page);
    
    // Navigation selectors with robust fallbacks
    this.adminMenuLink = page.getByRole('link', { name: 'Admin' })
      .or(page.locator('.oxd-main-menu-item').filter({ hasText: 'Admin' }));
    
    this.systemUsersHeading = page.getByRole('heading', { name: 'System Users' })
      .or(page.locator('h6:has-text("System Users")'));

    // Action buttons with specific role selectors
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.deleteButton = page.getByRole('button', { name: 'Delete Selected' })
      .or(page.locator('button:has-text("Delete")'));

    // Form containers
    this.searchForm = page.locator('form').first();
    this.addUserForm = page.locator('form').nth(1).or(page.locator('.oxd-form'));

    // Form elements with specific selectors
    this.userRoleDropdown = page.locator('div:has(label:has-text("User Role")) .oxd-select-text-input')
      .or(page.locator('.oxd-select-text').first());
    
    this.employeeNameInput = page.getByRole('textbox', { name: 'Type for hints...' })
      .or(page.getByPlaceholder('Type for hints...'));
    
    this.statusDropdown = page.locator('div:has(label:has-text("Status")) .oxd-select-text-input')
      .or(page.locator('.oxd-select-text').nth(1));
    
    this.usernameInput = page.locator('div:has(label:has-text("Username")) input')
      .or(page.locator('input').nth(1));
    
    this.passwordInput = page.locator('div:has(label:has-text("Password")) input[type="password"]')
      .or(page.locator('input[type="password"]').first());
    
    this.confirmPasswordInput = page.locator('div:has(label:has-text("Confirm Password")) input[type="password"]')
      .or(page.locator('input[type="password"]').nth(1));

    // Search elements
    this.searchUsernameInput = this.searchForm.locator('input[type="text"]').first()
      .or(page.locator('input').first());

    // Table and results
    this.usersTable = page.locator('.oxd-table-body')
      .or(page.locator('table tbody'));
    
    this.tableRows = this.usersTable.locator('.oxd-table-row')
      .or(page.locator('tr:has(td)'));
    
    this.noRecordsMessage = page.getByText('No Records Found')
      .or(page.locator(':has-text("No Records")'));

    // Confirmation elements
    this.deleteConfirmButton = page.getByRole('button', { name: 'Yes, Delete' })
      .or(page.locator('button:has-text("Yes")'));
    
    this.successToast = page.locator('.oxd-toast--success')
      .or(page.getByText(/successfully|success/i));
  }

  /**
   * Navigate to Admin → User Management → Users page
   */
  async gotoAdmin(): Promise<void> {
    await this.adminMenuLink.click();
    await this.page.waitForURL(/\/admin\//i, { timeout: 15000 });
    await this.expectVisible(this.systemUsersHeading, 'System Users heading should be visible');
  }

  /**
   * Check if currently on the admin users page
   */
  async isOnPage(): Promise<boolean> {
    try {
      const urlMatches = this.page.url().includes('/admin/');
      const headingVisible = await this.systemUsersHeading.isVisible({ timeout: 5000 });
      return urlMatches && headingVisible;
    } catch {
      return false;
    }
  }

  /**
   * Open the Add User form
   */
  async openAddUser(): Promise<void> {
    await this.addButton.click();
    await this.page.waitForTimeout(2000); // Wait for form to load
    await this.expectVisible(this.employeeNameInput, 'Employee name input should be visible in add form');
  }

  /**
   * Create a new user with comprehensive form handling
   */
  async createUser(params: UserData): Promise<void> {
    const { role, status, employeeName, username, password } = params;

    // Select User Role
    await this.userRoleDropdown.click();
    await this.page.waitForTimeout(1000);
    const roleOption = this.page.getByRole('option', { name: role })
      .or(this.page.locator(`[role="listbox"] >> text="${role}"`));
    await roleOption.click();

    // Fill Employee Name and select from autocomplete
    await this.employeeNameInput.fill(employeeName);
    await this.page.waitForTimeout(2000); // Wait for autocomplete
    
    const employeeOption = this.page.getByRole('option', { name: employeeName })
      .or(this.page.locator('.oxd-autocomplete-option').filter({ hasText: employeeName }));
    await employeeOption.click();

    // Select Status
    await this.statusDropdown.click();
    await this.page.waitForTimeout(1000);
    const statusOption = this.page.getByRole('option', { name: status })
      .or(this.page.locator(`[role="listbox"] >> text="${status}"`));
    await statusOption.click();

    // Fill Username (wait for field to be enabled)
    await this.page.waitForTimeout(1000);
    await this.usernameInput.fill(username);

    // Fill passwords
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);

    // Save and wait for success
    await this.saveButton.click();
    await this.expectVisible(this.successToast, 'Success message should appear after creating user');
    
    // Wait for navigation back to list
    await this.page.waitForURL(/\/admin\//i, { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Search for a user by username
   */
  async search(username: string): Promise<void> {
    // Reset any existing search first
    await this.resetButton.click();
    await this.page.waitForTimeout(2000);

    // Fill search username
    await this.searchUsernameInput.fill(username);
    
    // Click search and wait for results
    await this.searchButton.click();
    await this.page.waitForTimeout(3000);
  }

  /**
   * Check if the table contains a specific user
   */
  async tableHasUser(username: string): Promise<boolean> {
    try {
      const userRow = this.tableRows.filter({ hasText: username });
      return await userRow.count() > 0;
    } catch {
      return false;
    }
  }

  /**
   * Open a user from the table for editing
   */
  async openUserFromTable(username: string): Promise<void> {
    const userRow = this.tableRows.filter({ hasText: username });
    await this.expectVisible(userRow, `User row with username '${username}' should be visible`);
    
    // Click on the username link or edit icon
    const editButton = userRow.locator('.oxd-icon-button').first()
      .or(userRow.getByText(username));
    await editButton.click();
    
    // Wait for edit form to load
    await this.page.waitForTimeout(2000);
    await this.expectVisible(this.saveButton, 'Save button should be visible in edit form');
  }

  /**
   * Edit current user with partial data
   */
  async editCurrentUser(params: EditUserData): Promise<void> {
    const { role, status } = params;

    if (role) {
      await this.userRoleDropdown.click();
      await this.page.waitForTimeout(1000);
      const roleOption = this.page.getByRole('option', { name: role });
      await roleOption.click();
    }

    if (status) {
      await this.statusDropdown.click();
      await this.page.waitForTimeout(1000);
      const statusOption = this.page.getByRole('option', { name: status });
      await statusOption.click();
    }

    // Save changes
    await this.saveButton.click();
    await this.expectVisible(this.successToast, 'Success message should appear after editing user');
    
    // Wait for navigation back to list
    await this.page.waitForURL(/\/admin\//i, { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Delete a user by username
   */
  async deleteUser(username: string): Promise<void> {
    // First search for the user
    await this.search(username);
    
    // Find and select the user row checkbox
    const userRow = this.tableRows.filter({ hasText: username });
    await this.expectVisible(userRow, `User row with username '${username}' should be visible`);
    
    const checkbox = userRow.locator('input[type="checkbox"]');
    await checkbox.click();

    // Click delete button
    await this.deleteButton.click();

    // Confirm deletion in modal
    await this.expectVisible(this.deleteConfirmButton, 'Delete confirmation button should be visible');
    await this.deleteConfirmButton.click();

    // Wait for success message
    await this.expectVisible(this.successToast, 'Success message should appear after deleting user');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Reset search form to initial state
   */
  async resetSearch(): Promise<void> {
    await this.resetButton.click();
    await this.page.waitForTimeout(2000);
  }

  /**
   * Verify the admin users page is properly loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await this.expectVisible(this.systemUsersHeading, 'System Users heading should be visible');
    await this.expectVisible(this.addButton, 'Add button should be visible');
    await this.expectVisible(this.searchButton, 'Search button should be visible');
  }
}