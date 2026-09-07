// Projects (Proiecte) tests: empty-state idea chips, creating projects (idea chip + custom),
// adding/completing items, search, the Lists/Search/Completed segment, and two-tap project delete.
// Default UI language = EN.
//
// Migrated to the page object layer. Two local helpers are gone: openProjects asserted, which a
// page object may not do, and seedBooksProject is now two named calls at the top of the tests that
// need it, which is shorter to read than the helper it replaces.
const { test, expect } = require('../fixtures/app.fixture');

test.describe('projects', () => {
  test('empty state shows the title + 3 idea chips', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Projects');
    await expect(app.view).toHaveAttribute('data-view', 'proj');

    // Should show the empty-state with no projects yet
    await expect(app.projects.emptyMessage).toBeVisible();
    // Should offer the 3 idea chips
    for (const name of ['Books & reading', 'Self-care', 'Ideas & insights']) {
      await expect(app.projects.ideaChip(name)).toBeVisible();
    }
  });

  test('tapping an idea chip creates that project', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Projects');

    // Tapping "Books & reading" should create the project...
    await app.projects.ideaChip('Books & reading').click();
    // ...the title reflects it and the empty-state is gone
    await expect(app.projects.title).toHaveText('Books & reading');
    await expect(app.projects.emptyMessage).toHaveCount(0);
    // ...and the add-item input is now available
    await expect(app.projects.addItemField).toBeVisible();
  });

  test('adding a custom project via the add-project chip', async ({ app }) => {
    await app.launch();
    // need at least one project so the chip bar (with the add chip) shows
    await app.day.tapPetal('Projects');
    await app.projects.ideaChip('Books & reading').click();

    // Open the new-project form from the add chip
    await app.projects.addProjectChip.click();
    await app.projects.newProjectField.fill('Spain trip');
    await app.projects.newProjectConfirm.click();

    // The new project becomes active (its title shows)
    await expect(app.projects.title).toHaveText('Spain trip');
  });

  test('adding an item then completing it', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Projects');
    await app.projects.ideaChip('Books & reading').click();

    // Add an item to the list
    await app.projects.addItemField.fill('Read Atomic Habits');
    await app.projects.addItem.click();
    await expect(app.projects.itemList.getByText('Read Atomic Habits')).toBeVisible();

    // Tapping the item tick marks it done
    await app.projects.itemTick('Read Atomic Habits').click();
    await expect(app.projects.itemRow('Read Atomic Habits')).toHaveClass(/done/);
  });

  test('search finds a created item', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Projects');
    await app.projects.ideaChip('Books & reading').click();
    await app.projects.addItemField.fill('Selenium course');
    await app.projects.addItem.click();

    // Switch to the Search sub-view and query (needs at least 2 characters)
    await app.projects.segment('Search').click();
    await app.projects.searchField.fill('selenium');

    // The item appears in the search results
    await expect(app.projects.searchResults.getByText('Selenium course')).toBeVisible();
  });

  test('the Lists/Search/Completed segment swaps the sub-views', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Projects');

    await app.projects.segment('Search').click();
    await expect(app.projects.searchPanel).toBeVisible();
    await expect(app.projects.listPanel).toBeHidden();

    await app.projects.segment('Completed').click();
    await expect(app.projects.completedPanel).toBeVisible();

    await app.projects.segment('Lists').click();
    await expect(app.projects.listPanel).toBeVisible();
  });

  test('two-tap delete removes the project (back to empty state)', async ({ app }) => {
    await app.launch();
    await app.day.tapPetal('Projects');
    await app.projects.ideaChip('Books & reading').click(); // single project

    // First tap arms the delete, second tap confirms
    await app.projects.deleteProject.click();
    await app.projects.deleteProject.click();

    // With no projects left, the empty-state returns
    await expect(app.projects.emptyMessage).toBeVisible();
  });
});
