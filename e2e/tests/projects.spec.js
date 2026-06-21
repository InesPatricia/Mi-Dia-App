// Projects (Proiecte) tests: empty-state idea chips, creating projects (idea chip +
// custom), adding/completing items, search, the Lists/Search/Completed segment, and
// two-tap project delete. Default UI language = EN.
// Locators: lead with user-facing — getByRole by name (segment, idea chips, project
// title), getByPlaceholder (inputs), getByText (items). IDs/structural only for unlabelled
// controls (#itemAdd, #newProjOk, the item tick `.itick`, the project chips region).
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

async function openProjects(page) {
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-view', 'proj');
}
// create the "Books & reading" project from the empty-state idea chip
async function seedBooksProject(page) {
  await openProjects(page);
  await page.getByRole('button', { name: 'Books & reading', exact: true }).click();
}

test.describe('projects', () => {
  test('empty state shows the title + 3 idea chips', async ({ page }) => {
    await gotoApp(page);
    await openProjects(page);

    // Should show the empty-state with no projects yet
    await expect(page.getByText('No projects yet')).toBeVisible();
    // Should offer the 3 idea chips
    for (const name of ['Books & reading', 'Self-care', 'Ideas & insights']) {
      await expect(page.locator('.proj-empty').getByRole('button', { name, exact: true })).toBeVisible();
    }
  });

  test('tapping an idea chip creates that project', async ({ page }) => {
    await gotoApp(page);
    await openProjects(page);

    // Tapping "Books & reading" should create the project...
    await page.getByRole('button', { name: 'Books & reading', exact: true }).click();
    // ...the title reflects it and the empty-state is gone
    await expect(page.locator('#projTitle')).toHaveText('Books & reading');
    await expect(page.getByText('No projects yet')).toHaveCount(0);
    // ...and the add-item input is now available
    await expect(page.getByPlaceholder('Add to list', { exact: false })).toBeVisible();
  });

  test('adding a custom project via the "+ project" chip', async ({ page }) => {
    await gotoApp(page);
    await seedBooksProject(page); // need at least one project so the chip bar (with "+ project") shows

    // Open the new-project form from the "+ project" chip
    await page.locator('#projChips .projchip.add').click();
    await page.getByPlaceholder('New project', { exact: false }).fill('Spain trip');
    await page.locator('#newProjOk').click();

    // The new project becomes active (its title shows)
    await expect(page.locator('#projTitle')).toHaveText('Spain trip');
  });

  test('adding an item then completing it', async ({ page }) => {
    await gotoApp(page);
    await seedBooksProject(page);

    // Add an item to the list
    await page.getByPlaceholder('Add to list', { exact: false }).fill('Read Atomic Habits');
    await page.locator('#itemAdd').click();
    await expect(page.locator('#itemList').getByText('Read Atomic Habits')).toBeVisible();

    // Tapping the item tick marks it done
    const row = page.locator('.itemrow', { hasText: 'Read Atomic Habits' });
    await row.locator('.itick').click();
    await expect(row).toHaveClass(/done/);
  });

  test('search finds a created item', async ({ page }) => {
    await gotoApp(page);
    await seedBooksProject(page);
    await page.getByPlaceholder('Add to list', { exact: false }).fill('Selenium course');
    await page.locator('#itemAdd').click();

    // Switch to the Search sub-view and query (needs >=2 chars)
    await page.locator('#projMode').getByRole('button', { name: 'Search', exact: true }).click();
    await page.locator('#searchIn').fill('selenium');

    // The item appears in the search results
    await expect(page.locator('#searchResults').getByText('Selenium course')).toBeVisible();
  });

  test('the Lists/Search/Completed segment swaps the sub-views', async ({ page }) => {
    await gotoApp(page);
    await openProjects(page);
    const seg = (name) => page.locator('#projMode').getByRole('button', { name, exact: true });

    await seg('Search').click();
    await expect(page.locator('#proj-search')).toBeVisible();
    await expect(page.locator('#proj-list')).toBeHidden();

    await seg('Completed').click();
    await expect(page.locator('#proj-done')).toBeVisible();

    await seg('Lists').click();
    await expect(page.locator('#proj-list')).toBeVisible();
  });

  test('two-tap delete removes the project (back to empty state)', async ({ page }) => {
    await gotoApp(page);
    await seedBooksProject(page); // single project

    // First tap arms the trash, second tap confirms
    await page.locator('#projDel').click();
    await page.locator('#projDel').click();

    // With no projects left, the empty-state returns
    await expect(page.getByText('No projects yet')).toBeVisible();
  });
});
