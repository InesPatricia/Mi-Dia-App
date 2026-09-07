// The Projects screen: the empty state and its idea chips, the project chip bar, the item list, the
// search sub-view, and the two-tap project delete.
//
// Locator notes carried from the spec it replaces: lead with user-facing locators, and use ids or
// structure only for controls with no accessible name. Several here have none, which is a gap in
// the application rather than a preference in the tests.
//
// No assertions, by the rule in app.page.js and by the lint that enforces it.
class ProjectsPage {
  constructor(page) {
    this.page = page;
  }

  get emptyState() {
    return this.page.locator('.proj-empty');
  }

  /** The empty-state message. */
  get emptyMessage() {
    return this.page.getByText('No projects yet');
  }

  /** One idea chip in the empty state. */
  ideaChip(name) {
    return this.emptyState.getByRole('button', { name, exact: true });
  }

  /** The active project's title. */
  get title() {
    return this.page.locator('#projTitle');
  }

  /** The chip bar, which only appears once at least one project exists. */
  get chips() {
    return this.page.locator('#projChips');
  }

  /** The chip that opens the new-project form. No accessible name, so it is reached by class. */
  get addProjectChip() {
    return this.chips.locator('.projchip.add');
  }

  get newProjectField() {
    return this.page.getByPlaceholder('New project', { exact: false });
  }

  get newProjectConfirm() {
    return this.page.locator('#newProjOk');
  }

  get addItemField() {
    return this.page.getByPlaceholder('Add to list', { exact: false });
  }

  get addItem() {
    return this.page.locator('#itemAdd');
  }

  get itemList() {
    return this.page.locator('#itemList');
  }

  /** One item row, anchored by the text a user typed into it. */
  itemRow(text) {
    return this.page.locator('.itemrow', { hasText: text });
  }

  /** The tick on one item row. No accessible name, so it is reached inside the anchored row. */
  itemTick(text) {
    return this.itemRow(text).locator('.itick');
  }

  /** The Lists, Search and Completed segmented control. */
  segment(name) {
    return this.page.locator('#projMode').getByRole('button', { name, exact: true });
  }

  get listPanel() {
    return this.page.locator('#proj-list');
  }

  get searchPanel() {
    return this.page.locator('#proj-search');
  }

  get completedPanel() {
    return this.page.locator('#proj-done');
  }

  get searchField() {
    return this.page.locator('#searchIn');
  }

  get searchResults() {
    return this.page.locator('#searchResults');
  }

  /** The project delete control. A deliberate two-tap confirm, left to the spec to press twice. */
  get deleteProject() {
    return this.page.locator('#projDel');
  }
}

module.exports = { ProjectsPage };
