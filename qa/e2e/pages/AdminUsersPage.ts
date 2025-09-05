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
  // --- Escopo do modal "Add User"
  // Modal (com fallbacks) - busca por container visível ou campos do form
  get addUserModal() {
    // Tenta encontrar o container do modal visível
    const visibleModal = this.page.locator('.oxd-dialog-container:visible, .oxd-sheet:visible');
    // Se não encontrar, usa o container pai do form de Add User
    const formContainer = this.page.locator('form:has(label:has-text("User Role"))');
    return visibleModal.or(formContainer).first();
  }

  // Campos do modal, SEM :text-is() e sempre escopados ao modal
  get userRoleDropdown() {
    return this.addUserModal.locator('div.oxd-input-group:has(label:has-text("User Role")) .oxd-select-text');
  }
  get employeeNameInput() {
    return this.addUserModal.getByPlaceholder('Type for hints...');
  }
  get statusDropdown() {
    return this.addUserModal.locator('div.oxd-input-group:has(label:has-text("Status")) .oxd-select-text');
  }
  get usernameInput() {
    return this.addUserModal
      .locator('div.oxd-input-group:has(label:has-text("Username")) input')
      .first(); // evita strict mode
  }
  get passwordInput() {
    return this.addUserModal
      .locator('div.oxd-input-group:has(label:has-text("Password")) input[type="password"]')
      .first();
  }
  get confirmPasswordInput() {
    return this.addUserModal
      .locator('div.oxd-input-group:has(label:has-text("Confirm Password")) input[type="password"]');
  }
  get saveButton() {
    return this.addUserModal.getByRole('button', { name: 'Save' });
  }

  // Navigation elements
  readonly adminMenuLink: Locator;
  readonly systemUsersHeading: Locator;

  // Action buttons
  readonly addButton: Locator;
  readonly deleteButton: Locator;

  // Form de busca — seletores tolerantes (mas estáveis)
  // Form de busca: prioriza o painel de filtros; fallback para primeiro <form>
  get searchForm() {
    return this.page.locator('.oxd-table-filter, .oxd-table-header, form').first();
  }
  get searchUsernameInput() {
    // Busca apenas inputs de busca na tabela, excluindo modais
    return this.page.locator('.oxd-table-filter input, .oxd-table-header input')
      .first()
      .or(this.page.locator('form:not(:has(label:has-text("Employee Name"))) input[type="text"]'))
      .first();
  }
  get searchButton() {
    return this.searchForm.getByRole('button', { name: 'Search' })
      .or(this.page.getByRole('button', { name: 'Search' }));
  }
  get resetButton() {
    return this.searchForm.getByRole('button', { name: 'Reset' })
      .or(this.page.getByRole('button', { name: 'Reset' }));
  }

  // Containers
  readonly usersTable: Locator;

  // Table and results
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

    // Action buttons
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.deleteButton = page.getByRole('button', { name: 'Delete Selected' })
      .or(page.locator('button:has-text("Delete")'));

    // Containers
    this.usersTable = page.locator('.oxd-table').first();

    // Table and results
    this.tableRows = this.usersTable.locator('.oxd-table-row:has(.oxd-table-cell), .oxd-table-row:has(td)');
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

    // Espera mais robusta: qualquer indicação de que o form está aberto
    await Promise.race([
      this.page.getByRole('heading', { name: 'Add User' }).waitFor({ state: 'visible', timeout: 8000 }),
      this.page.locator('label:has-text("User Role")').waitFor({ state: 'visible', timeout: 8000 }),
      this.page.locator('label:has-text("Employee Name")').waitFor({ state: 'visible', timeout: 8000 }),
    ]);

    // Aguarda um pouco para garantir que o form está totalmente carregado
    await this.page.waitForTimeout(1000);
  }

  /**
   * Create a new user with comprehensive form handling
   */
  async createUser(params: UserData): Promise<void> {
    const { role, status, employeeName, username, password } = params;

    // Select User Role
    await this.userRoleDropdown.click();
    await this.page.locator('[role="listbox"]').last().getByText(role, { exact: true }).click();

    // Fill Employee Name and select from autocomplete
    await this.employeeNameInput.fill(employeeName);
    await this.page.getByRole('option', { name: new RegExp(`^${employeeName}$`, 'i') }).first().click();

    // Select Status
    await this.statusDropdown.click();
    await this.page.locator('[role="listbox"]').last().getByText(status, { exact: true }).click();

    // Fill credentials
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);

    // Save and wait for success
    await this.saveButton.click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.usersTable).toBeVisible();
    await this.expectVisible(this.successToast, 'Success message should appear after creating user');
    
    // Wait for navigation back to list
    await this.page.waitForURL(/\/admin\//i, { timeout: 15000 });
  }

  /**
   * Search for a user by username
   */
  async search(username: string): Promise<void> {
    // Aguarda elementos de busca estarem prontos
    await this.page.waitForTimeout(1000); // Pequena pausa para estabilizar
    await this.searchUsernameInput.waitFor({ state: 'visible', timeout: 10000 });

    // Limpa campo anterior e preenche
    await this.searchUsernameInput.clear();
    await this.searchUsernameInput.fill(username);
    await this.searchButton.click();
    
    // Aguarda processamento da busca
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Aguarda resultados carregarem
  }

  /**
   * Check if the table contains a specific user
   */
  async tableHasUser(username: string): Promise<boolean> {
    try {
      // Aguarda tabela estar carregada
      await this.usersTable.waitFor({ state: 'visible', timeout: 5000 });
      
      // Busca por diferentes padrões de username na tabela
      const userRow = this.usersTable.locator(
        `.oxd-table-row:has-text("${username}"), ` +
        `.oxd-table-row:has(.oxd-table-cell:has-text("${username}"))`
      ).first();
      
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
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Aguarda resultados carregarem
  }

  /**
   * Verify the admin users page is properly loaded
   */
  async verifyPageLoaded(): Promise<void> {
    await this.expectVisible(this.systemUsersHeading, 'System Users heading should be visible');
    await this.expectVisible(this.addButton, 'Add button should be visible');
    await this.expectVisible(this.searchButton, 'Search button should be visible');
  }

  /**
   * Get a table row by username
   */
  rowByUsername(username: string): Locator {
    return this.usersTable.locator(`.oxd-table-row:has-text("${username}")`).first();
  }

  /**
   * Get checkbox in a specific user row
   */
  checkboxInRow(username: string): Locator {
    return this.rowByUsername(username).locator('input[type="checkbox"]').first();
  }
}