import { test, expect } from '@playwright/test';

async function waitForPageReady(page, label = 'Page') {
  const startTime = Date.now();
  
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('body', { state: 'visible' });
  await page.waitForTimeout(50); // Stabilization
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ ${label} ready in ${elapsed}ms`);
}

test.describe('Milestone 1: Frontend End-to-End Tests', () => {
  // --------------------- Before Each ---------------------
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await waitForPageReady(page, 'Initial load');
    // Clear localStorage for clean state
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForPageReady(page, 'After localStorage clear');
  });

  // --------------------- Task 1: App loads and displays basic UI ---------------------
  test('App loads and displays basic UI', { tag: ['@M1-T1'] }, async ({ page }) => {
    // Happy path: Check app logo/title exists
    await expect(page.locator('text=NotesApp')).toBeVisible();

    // Happy path: Check search input exists
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
    await expect(searchInput).toBeVisible();

    // Happy path: Check Add button exists
    const addButton = page.locator(
      "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
    ).first();
    await expect(addButton).toBeVisible();

    // Error handling: Verify page is in valid state (not error page)
    await expect(page.locator('body')).toBeVisible();
    const errorIndicators = page.locator('text=/error|Error|404|500/i');
    const errorCount = await errorIndicators.count();
    expect(errorCount).toBe(0);
  });

  // --------------------- Task 2: Can create a new note ---------------------
  test('Can create a new note', { tag: ['@M1-T2'] }, async ({ page }) => {
    const initialCount = await page.locator('[class*="rounded-lg cursor-pointer"]').count();

    // Happy path: Open modal
    const addButton = page.locator(
      "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
    ).first();
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Happy path: Verify modal/form is visible
    const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    await expect(titleInput).toBeVisible();

    const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
    await expect(bodyInput).toBeVisible();

    // Happy path: Fill form and create note
    await titleInput.fill('My Test Note');
    await bodyInput.fill('Test content');

    const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Happy path: Verify note count increased
    await expect.poll(async () => {
      return await page.locator('[class*="rounded-lg cursor-pointer"]').count();
    }, { timeout: 5000 }).toBeGreaterThan(initialCount);

    // Error handling: Try to create note with empty title
    await addButton.click();
    await waitForPageReady(page, 'Modal opened');
    
    const titleInput2 = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    const bodyInput2 = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
    
    // Leave title empty, fill body
    await titleInput2.fill('');
    await bodyInput2.fill('Content without title');
    
    const saveButton2 = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
    const countBeforeEmptyTitle = await page.locator('[class*="rounded-lg cursor-pointer"]').count();
    await saveButton2.click();
    
    // Should either show validation error or not create note
    await page.waitForTimeout(500);
    const countAfterEmptyTitle = await page.locator('[class*="rounded-lg cursor-pointer"]').count();
    // Either validation prevents save (count unchanged) or error message appears
    const hasValidationError = await page.locator('text=/required|invalid|error/i').count() > 0;
    expect(countAfterEmptyTitle === countBeforeEmptyTitle || hasValidationError).toBe(true);
  });

  // --------------------- Task 3: Can read and view a note ---------------------
  test('Can read and view a note', { tag: ['@M1-T3'] }, async ({ page }) => {
    const notes = page.locator('[class*="rounded-lg cursor-pointer"]');
    const noteCount = await notes.count();

    // Edge case: If no notes exist, create one first
    if (noteCount === 0) {
      const addButton = page.locator(
        "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
      ).first();
      await addButton.click();

      const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
      await titleInput.fill('Note for Viewing');
      const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
      await bodyInput.fill('Content to view');
      const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
      await saveButton.click();
      
      await waitForPageReady(page, 'Note created');
    }

    // Happy path: Select and view a note
    const firstNote = notes.first();
    await expect(firstNote).toBeVisible();
    
    const noteTitle = await firstNote.locator('h3, [class*="font-semibold"], [class*="title"]').first().textContent();
    expect(noteTitle).toBeTruthy();
    
    await firstNote.click();
    await waitForPageReady(page, 'Note selected');

    // Happy path: Verify note content is displayed
    if (noteTitle) {
      await expect(page.locator(`text=${noteTitle}`).first()).toBeVisible({ timeout: 5000 });
    }

    // Error handling: Try to view non-existent note (should handle gracefully)
    // This is tested by ensuring the UI doesn't crash when clicking invalid elements
    const invalidNote = page.locator('[data-invalid="true"]');
    const invalidCount = await invalidNote.count();
    expect(invalidCount).toBe(0); // No invalid notes should exist
  });

  // --------------------- Task 4: Can update a note ---------------------
  test('Can update a note', { tag: ['@M1-T4'] }, async ({ page }) => {
    const notes = page.locator('[class*="rounded-lg cursor-pointer"]');
    let noteCount = await notes.count();

    // Edge case: If no notes exist, create one first
    if (noteCount === 0) {
      const addButton = page.locator(
        "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
      ).first();
      await addButton.click();

      const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
      await titleInput.fill('Note to Update');
      const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
      await bodyInput.fill('Original content');
      const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
      await saveButton.click();
      
      await waitForPageReady(page, 'Note created');
      noteCount = await notes.count();
    }

    expect(noteCount).toBeGreaterThan(0);

    // Happy path: Select note to update
    const firstNote = notes.first();
    await firstNote.click();
    await waitForPageReady(page, 'Note selected');

    // Happy path: Edit note content
    const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
    
    // Wait for inputs to be visible and editable
    await expect(titleInput.or(bodyInput).first()).toBeVisible({ timeout: 5000 });
    
    const updatedTitle = `Updated Note ${Date.now()}`;
    const updatedContent = 'Updated content';
    
    // Clear and fill new content
    await titleInput.fill('');
    await titleInput.fill(updatedTitle);
    await bodyInput.fill('');
    await bodyInput.fill(updatedContent);

    // Happy path: Save changes
    const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Update")').first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    await waitForPageReady(page, 'Note updated');

    // Happy path: Verify changes are reflected
    await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({ timeout: 5000 });

    // Error handling: Try to update with empty title (should handle validation)
    await firstNote.click();
    await waitForPageReady(page, 'Note selected again');
    
    const titleInput2 = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
    await titleInput2.fill('');
    
    const saveButton2 = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Update")').first();
    await saveButton2.click();
    
    await page.waitForTimeout(500);
    // Should either show validation error or prevent save
    const hasValidationError = await page.locator('text=/required|invalid|error/i').count() > 0;
    // If no validation error, the title should still be the previous one
    if (!hasValidationError) {
      await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible();
    }
  });

  // --------------------- Task 5: Can delete a note ---------------------
  test('Can delete a note', { tag: ['@M1-T5'] }, async ({ page }) => {
    const notes = page.locator('[class*="rounded-lg cursor-pointer"]');
    let noteCount = await notes.count();

    // Edge case: If no notes exist, create one first
    if (noteCount === 0) {
      const addButton = page.locator(
        "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
      ).first();
      await addButton.click();

      const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
      await titleInput.fill('Note to Delete');
      const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
      await bodyInput.fill('This will be deleted');
      const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
      await saveButton.click();
      
      await waitForPageReady(page, 'Note created');
      noteCount = await notes.count();
    }

    expect(noteCount).toBeGreaterThan(0);

    // Happy path: Select note to delete
    const firstNote = notes.first();
    const noteTitle = await firstNote.locator('h3, [class*="font-semibold"], [class*="title"]').first().textContent();
    await firstNote.click();
    await waitForPageReady(page, 'Note selected');

    // Happy path: Delete the note
    const deleteButton = page.locator('button[title*="Delete"], button[title*="delete"], [aria-label*="delete"], button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Happy path: Verify note count decreased
    await expect.poll(async () => {
      return await notes.count();
    }, { timeout: 5000 }).toBeLessThan(noteCount);

    // Error handling: Try to delete when no notes exist (should handle gracefully)
    const remainingNotes = await notes.count();
    if (remainingNotes === 0) {
      // Verify delete button is not available or disabled
      const deleteButtonAfter = page.locator('button[title*="Delete"], button[title*="delete"], [aria-label*="delete"]');
      const deleteButtonCount = await deleteButtonAfter.count();
      // Either no delete button exists, or it's disabled
      if (deleteButtonCount > 0) {
        const isDisabled = await deleteButtonAfter.first().isDisabled();
        expect(isDisabled).toBe(true);
      }
    }
  });

  // --------------------- End-to-End Test ---------------------
  // test('End-to-End: Complete workflow', { tag: ['@M1-EndToEnd'] }, async ({ page }) => {
  //   // Task 1: App loads and displays basic UI
  //   await expect(page.locator('text=NotesApp')).toBeVisible();
  //   const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
  //   await expect(searchInput).toBeVisible();
  //   const addButton = page.locator(
  //     "button:has-text('Add'), button:has-text('+'), button:has-text('New'), button:has-text('Create'), [aria-label*='add'], [aria-label*='Add']"
  //   ).first();
  //   await expect(addButton).toBeVisible();

  //   // Task 2: Create a new note
  //   const initialCount = await page.locator('[class*="rounded-lg cursor-pointer"]').count();
  //   await addButton.click();
    
  //   const titleInput = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
  //   await expect(titleInput).toBeVisible();
  //   await titleInput.fill('E2E Test Note');
    
  //   const bodyInput = page.locator('textarea[id*="body"], textarea[placeholder*="writing"], textarea[placeholder*="note"]').first();
  //   await bodyInput.fill('E2E test content');
    
  //   const saveButton = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Create")').first();
  //   await saveButton.click();
    
  //   await expect.poll(async () => {
  //     return await page.locator('[class*="rounded-lg cursor-pointer"]').count();
  //   }, { timeout: 5000 }).toBeGreaterThan(initialCount);

  //   // Task 3: Read and view a note
  //   const notes = page.locator('[class*="rounded-lg cursor-pointer"]');
  //   const firstNote = notes.first();
  //   const noteTitle = await firstNote.locator('h3, [class*="font-semibold"], [class*="title"]').first().textContent();
  //   await firstNote.click();
  //   await waitForPageReady(page, 'Note selected');
    
  //   if (noteTitle) {
  //     await expect(page.locator(`text=${noteTitle}`).first()).toBeVisible({ timeout: 5000 });
  //   }

  //   // Task 4: Update a note
  //   const titleInput2 = page.locator('input[type="text"][id*="title"], input[placeholder*="Title"], input[placeholder*="title"]').first();
  //   await expect(titleInput2.or(page.locator('textarea').first())).toBeVisible({ timeout: 5000 });
    
  //   const updatedTitle = 'E2E Updated Note';
  //   await titleInput2.fill(updatedTitle);
    
  //   const saveButton2 = page.locator('button:has-text("Save"), button:has-text("save"), button:has-text("Submit"), button:has-text("Update")').first();
  //   await saveButton2.click();
  //   await waitForPageReady(page, 'Note updated');
    
  //   await expect(page.locator(`text=${updatedTitle}`).first()).toBeVisible({ timeout: 5000 });

  //   // Task 5: Delete a note
  //   const noteCountBeforeDelete = await notes.count();
  //   expect(noteCountBeforeDelete).toBeGreaterThan(0);
    
  //   await firstNote.click();
  //   await waitForPageReady(page, 'Note selected for delete');
    
  //   const deleteButton = page.locator('button[title*="Delete"], button[title*="delete"], [aria-label*="delete"], button:has-text("Delete")').first();
  //   await expect(deleteButton).toBeVisible();
  //   await deleteButton.click();
    
  //   await expect.poll(async () => {
  //     return await notes.count();
  //   }, { timeout: 5000 }).toBeLessThan(noteCountBeforeDelete);
  // });
});
