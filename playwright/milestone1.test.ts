import { test, expect } from '@playwright/test';

test.describe('Milestone 1: Frontend End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure clean state
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('App loads and displays basic UI', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);

    // Check app logo/title exists
    await expect(page.locator('text=NotesApp')).toBeVisible();

    // Check search input exists
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
    await expect(searchInput).toBeVisible();

    // Check Add button exists (flexible - works with any button text)
    const addButton = page.locator(
      "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
    ).first();
    await expect(addButton).toBeVisible();
  });

  test('Sample notes are displayed', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);

    // Check that at least one note is rendered
    const notes = page.locator('[class*="rounded-lg cursor-pointer"]');
    const noteCount = await notes.count();
    expect(noteCount).toBeGreaterThan(0);
  });

  test('Can open Add Note modal', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);

    // Click Add button
    const addButton = page.locator(
      "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
    ).first();
    await addButton.click();
    await page.waitForTimeout(300);

    // Check modal is visible (check for form fields)
    await expect(page.locator('input[type="text"], textarea').first()).toBeVisible();
  });

  test('Can create a new note', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);

    const initialCount = await page.locator('[class*="rounded-lg cursor-pointer"]').count();

    // Open modal
    const addButton = page.locator(
      "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
    ).first();
    await addButton.click();
    await page.waitForTimeout(300);

    // Fill form
    const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    await titleInput.fill('My Test Note');

    const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
    await bodyInput.fill('Test content');

    // Save
    const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify note count increased
    const newCount = await page.locator('[class*="rounded-lg cursor-pointer"]').count();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('Can select and view a note', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);

    // Click first note
    const firstNote = page.locator('[class*="rounded-lg cursor-pointer"]').first();
    const noteTitle = await firstNote.locator('h3, [class*="font-semibold"]').textContent();
    await firstNote.click();
    await page.waitForTimeout(500);

    // Verify note title is displayed in editor
    if (noteTitle) {
      await expect(page.locator(`text=${noteTitle}`).first()).toBeVisible();
    }
  });

  test('Can delete a note', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(500);

    // Get initial count
    const notes = page.locator('[class*="rounded-lg cursor-pointer"]');
    const initialCount = await notes.count();
    expect(initialCount).toBeGreaterThan(0);

    // Select first note
    const firstNote = notes.first();
    await firstNote.click();
    await page.waitForTimeout(300);

    // Delete
    const deleteButton = page.locator('button[title*="Delete"], button[title*="delete"], [aria-label*="delete"]').first();
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Verify count decreased
    const newCount = await page.locator('[class*="rounded-lg cursor-pointer"]').count();
    expect(newCount).toBeLessThan(initialCount);
  });
});
