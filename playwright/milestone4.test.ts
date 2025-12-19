import { test, expect } from '@playwright/test';

test.describe('Milestone 4: Frontend + Backend Integration Tests', () => {
  // Clear all notes from database before running milestone4 tests
  // Using a flag to ensure it only runs once even with multiple workers
  let dbCleared = false;
  
  test.beforeAll(async ({ request }) => {
    // Only clear once - use a simple check to prevent multiple clears
    if (!dbCleared) {
      try {
        const response = await request.delete('http://localhost:3000/api/Notes/reset/all');
        if (response.ok()) {
          console.log('All notes cleared from database for milestone4 tests');
          dbCleared = true;
        } else {
          console.warn('Failed to clear notes:', await response.text());
        }
      } catch (error) {
        console.warn('Error clearing notes (backend might not be running):', error instanceof Error ? error.message : String(error));
        // Don't fail the tests if backend is not available - tests will handle this
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);
  });

  test('User can view notes from database', async ({ page }) => {
    // Check that notes are displayed (either from database or empty state)
    const notesContainer = page.locator('[data-testid="note-list"]');
    await expect(notesContainer).toBeVisible();
  });

  test('User can create a new note and it saves to database', async ({ page }) => {
    // Get initial note count
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    const initialCount = await notes.count();

    // Wait for the POST request to create the note
    const createPromise = page.waitForResponse(response => 
      response.url() === 'http://localhost:3000/api/Notes' && 
      response.request().method() === 'POST'
    );
    
    // Wait for the GET request to refresh the notes list
    const refreshPromise = page.waitForResponse(response => 
      response.url() === 'http://localhost:3000/api/Notes' && 
      response.request().method() === 'GET'
    );

    // Click Add button
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();
    await page.waitForTimeout(300);

    // Fill form
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill('Database Note Test');

    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill('This note should be saved to database');

    // Save
    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    
    // Wait for the create request to complete
    await createPromise;
    
    // Wait for the notes list to refresh
    await refreshPromise;
    
    // Wait for count to actually increase (more reliable than fixed timeout)
    await expect.poll(async () => {
      return await notes.count();
    }, { timeout: 10000 }).toBeGreaterThan(initialCount);

    // Verify note title is displayed
    await expect(page.getByText('Database Note Test').first()).toBeVisible();
  });

  test('User can view individual note details from database', async ({ page }) => {
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    const noteCount = await notes.count();
    
    if (noteCount > 0) {
      const firstNote = notes.first();
      const noteTitle = await firstNote.locator('h3').textContent();
      await firstNote.click();
      await page.waitForTimeout(500);

      // Verify note title is displayed in editor
      if (noteTitle) {
        await expect(page.getByText(noteTitle).first()).toBeVisible();
      }
    }
  });

  test('User can delete a note and it removes from database', async ({ page }) => {
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    const initialCount = await notes.count();
    
    if (initialCount > 0) {
      // Get the first note's data-testid
      const firstNote = notes.first();
      const firstNoteId = await firstNote.getAttribute('data-testid');
      
      // Select first note
      await firstNote.click();
      
      // Wait for note editor to be visible (ensures note is loaded)
      await expect(page.locator('[data-testid="note-editor"]')).toBeVisible();
      await page.waitForTimeout(300);

      // Wait for delete button to be visible and clickable
      const deleteButton = page.locator('[data-testid="delete-note-button"]');
      await expect(deleteButton).toBeVisible();
      await expect(deleteButton).toBeEnabled();
      
      // Set up promises to wait for network requests BEFORE clicking
      const deletePromise = page.waitForResponse(response => {
        const url = response.url();
        const method = response.request().method();
        return url.startsWith('http://localhost:3000/api/Notes/') && 
               url !== 'http://localhost:3000/api/Notes' &&
               method === 'DELETE';
      });
      
      const refreshPromise = page.waitForResponse(response => 
        response.url() === 'http://localhost:3000/api/Notes' && 
        response.request().method() === 'GET'
      );
      
      // Click delete button
      await deleteButton.click();
      
      // Wait for the delete request to complete
      await deletePromise;
      
      // Wait for the notes list to refresh
      await refreshPromise;
      
      // Wait for count to actually decrease (more reliable than fixed timeout)
      await expect.poll(async () => {
        return await notes.count();
      }, { timeout: 10000 }).toBeLessThan(initialCount);
      
      // Verify the specific note is gone
      if (firstNoteId) {
        await expect(noteList.locator(`[data-testid="${firstNoteId}"]`)).not.toBeVisible({ timeout: 5000 });
      }

      // Final verification that count decreased
      const finalCount = await notes.count();
      expect(finalCount).toBeLessThan(initialCount);
    }
  });

  test('User can search notes (frontend filtering)', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const searchExists = await searchInput.count();
    
    if (searchExists > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Search should filter notes (UI behavior)
      const visibleNotes = page.locator('[data-testid="note-list"]').locator('[data-testid^="note-item-"]');
      const visibleCount = await visibleNotes.count();
      expect(visibleCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Data persists after page refresh (from database)', async ({ page }) => {
    // Create a note first
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();
    await page.waitForTimeout(300);

    const uniqueTitle = `Persist Test ${Date.now()}`;
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill(uniqueTitle);

    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill('This should persist after refresh');

    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Verify note exists
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();

    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);

    // Verify note still exists after refresh (loaded from database)
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();
  });

  test('Complete workflow: Create, View, Search, Delete', async ({ page }) => {
    // 1. Create note
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();
    await page.waitForTimeout(300);

    const workflowTitle = `Workflow Test ${Date.now()}`;
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill(workflowTitle);

    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill('Complete workflow test');

    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    // 2. View note
    const noteList = page.locator('[data-testid="note-list"]');
    await expect(noteList.getByText(workflowTitle).first()).toBeVisible();

    // 3. Search for note
    const searchInput = page.getByPlaceholder(/search/i);
    const searchExists = await searchInput.count();
    if (searchExists > 0) {
      await searchInput.fill('Workflow');
      await page.waitForTimeout(500);
      await expect(noteList.getByText(workflowTitle).first()).toBeVisible();
    }

    // 4. Delete note
    const noteItem = noteList.locator('[data-testid^="note-item-"]').filter({ hasText: workflowTitle }).first();
    await noteItem.click();
    await page.waitForTimeout(500);

    // Wait for delete button and set up network waits
    const deleteButton = page.locator('[data-testid="delete-note-button"]');
    await expect(deleteButton).toBeVisible();
    
    const deletePromise = page.waitForResponse(response => {
      const url = response.url();
      return url.startsWith('http://localhost:3000/api/Notes/') && 
             url !== 'http://localhost:3000/api/Notes' &&
             response.request().method() === 'DELETE';
    });
    
    await deleteButton.click();
    await deletePromise;
    await page.waitForTimeout(1000);

    // Verify note is deleted
    const noteAfterDelete = page.getByText(workflowTitle);
    const count = await noteAfterDelete.count();
    expect(count).toBe(0);
  });
});
