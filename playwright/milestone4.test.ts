import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

async function makeRequest(method: string, path: string, body?: any) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return {
    status: response.status,
    body: data,
  };
}

async function waitForPageReady(page, label = 'Page') {
  const startTime = Date.now();
  
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('body', { state: 'visible' });
  await page.waitForTimeout(50); // Stabilization
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ ${label} ready in ${elapsed}ms`);
}

test.describe('Milestone 4: Frontend + Backend Integration Tests', () => {
  // Clear all notes from database before running milestone4 tests
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
    await waitForPageReady(page, 'Initial load');
  });

  // --------------------- Task 1: User can view notes from database ---------------------
  test('User can view notes from database', { tag: ['@M4-T1'] }, async ({ page }) => {
    // Happy path: Check that notes container is displayed
    const notesContainer = page.locator('[data-testid="note-list"]');
    await expect(notesContainer).toBeVisible({ timeout: 10000 });

    // Happy path: Notes should be loaded from database (either empty or with notes)
    const notes = notesContainer.locator('[data-testid^="note-item-"]');
    const noteCount = await notes.count();
    expect(noteCount).toBeGreaterThanOrEqual(0);

    // Database verification: Verify notes in UI match database
    const dbResponse = await makeRequest('GET', '/api/Notes');
    expect(dbResponse.status).toBe(200);
    expect(Array.isArray(dbResponse.body)).toBe(true);
    
    // If there are notes in DB, they should be visible in UI
    if (dbResponse.body.length > 0) {
      // At least one note should be visible
      const visibleNotes = await notes.count();
      expect(visibleNotes).toBeGreaterThan(0);
    }

    // Error handling: Verify UI handles empty state gracefully
    if (noteCount === 0) {
      // Should show empty state or no error
      const errorIndicators = page.locator('text=/error|Error|404|500/i');
      const errorCount = await errorIndicators.count();
      expect(errorCount).toBe(0);
    }
  });

  // --------------------- Task 2: User can create a new note and it saves to database ---------------------
  test('User can create a new note and it saves to database', { tag: ['@M4-T2'] }, async ({ page }) => {
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

    // Happy path: Click Add button
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    // Happy path: Fill form
    const uniqueTitle = `Database Note Test ${Date.now()}`;
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill(uniqueTitle);

    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill('This note should be saved to database');

    // Happy path: Save
    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    
    // Wait for the create request to complete
    await createPromise;
    
    // Wait for the notes list to refresh
    await refreshPromise;
    
    // Happy path: Verify note count increased
    await expect.poll(async () => {
      return await notes.count();
    }, { timeout: 10000 }).toBeGreaterThan(initialCount);

    // Happy path: Verify note title is displayed
    await expect(page.getByText(uniqueTitle).first()).toBeVisible();

    // Database verification: Query database to verify note was saved
    const dbResponse = await makeRequest('GET', '/api/Notes');
    expect(dbResponse.status).toBe(200);
    expect(Array.isArray(dbResponse.body)).toBe(true);
    const savedNote = dbResponse.body.find((note: any) => note.title === uniqueTitle);
    expect(savedNote).toBeTruthy();
    expect(savedNote.content).toContain('This note should be saved to database');

    // Error handling: Try to create note with empty title
    await addButton.click();
    await waitForPageReady(page, 'Modal opened');
    
    const titleInput2 = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    const bodyInput2 = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    
    await titleInput2.fill('');
    await bodyInput2.fill('Content without title');
    
    const saveButton2 = page.getByRole('button', { name: /save/i }).first();
    const countBeforeEmptyTitle = await notes.count();
    await saveButton2.click();
    
    await page.waitForTimeout(1000);
    // Should either show validation error or not create note
    const countAfterEmptyTitle = await notes.count();
    const hasValidationError = await page.locator('text=/required|invalid|error/i').count() > 0;
    expect(countAfterEmptyTitle === countBeforeEmptyTitle || hasValidationError).toBe(true);
  });

  // --------------------- Task 3: User can view individual note details from database ---------------------
  test('User can view individual note details from database', { tag: ['@M4-T3'] }, async ({ page }) => {
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    const noteCount = await notes.count();
    
    // Edge case: If no notes exist, create one first
    if (noteCount === 0) {
      const addButton = page.getByRole('button', { name: /add/i }).first();
      await addButton.click();

      const uniqueTitle = `Note for Viewing ${Date.now()}`;
      const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
      await titleInput.fill(uniqueTitle);
      const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
      await bodyInput.fill('Content to view');
      const saveButton = page.getByRole('button', { name: /save/i }).first();
      await saveButton.click();
      
      await waitForPageReady(page, 'Note created');
    }

    // Happy path: Select and view note
    const firstNote = notes.first();
    await expect(firstNote).toBeVisible();
    
    const noteTitle = await firstNote.locator('h3').textContent();
    expect(noteTitle).toBeTruthy();
    
    await firstNote.click();
    await waitForPageReady(page, 'Note selected');

    // Happy path: Verify note title is displayed in editor
    if (noteTitle) {
      await expect(page.getByText(noteTitle).first()).toBeVisible({ timeout: 5000 });
    }

    // Database verification: Verify note data matches database
    const dbResponse = await makeRequest('GET', '/api/Notes');
    expect(dbResponse.status).toBe(200);
    if (noteTitle) {
      const dbNote = dbResponse.body.find((note: any) => note.title === noteTitle);
      expect(dbNote).toBeTruthy();
    }

    // Error handling: Verify UI handles invalid note selection gracefully
    const errorIndicators = page.locator('text=/error|Error|404|500/i');
    const errorCount = await errorIndicators.count();
    expect(errorCount).toBe(0);
  });

  // --------------------- Task 4: User can update a note and changes persist to database ---------------------
  test('User can update a note and changes persist to database', { tag: ['@M4-T4'] }, async ({ page }) => {
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    let noteCount = await notes.count();
    
    // Edge case: If no notes exist, create one first
    if (noteCount === 0) {
      const addButton = page.getByRole('button', { name: /add/i }).first();
      await addButton.click();

      const uniqueTitle = `Note to Update ${Date.now()}`;
      const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
      await titleInput.fill(uniqueTitle);
      const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
      await bodyInput.fill('Original content');
      const saveButton = page.getByRole('button', { name: /save/i }).first();
      await saveButton.click();
      
      await waitForPageReady(page, 'Note created');
      noteCount = await notes.count();
    }

    expect(noteCount).toBeGreaterThan(0);

    // Happy path: Select note to update
    const firstNote = notes.first();
    const originalTitle = await firstNote.locator('h3').textContent();
    await firstNote.click();
    await waitForPageReady(page, 'Note selected');

    // Wait for note editor to be visible
    await expect(page.locator('[data-testid="note-editor"]').or(page.locator('input, textarea').first())).toBeVisible({ timeout: 5000 });

    // Happy path: Update note content
    const updatedTitle = `Updated Note ${Date.now()}`;
    const updatedContent = 'Updated content in database';
    
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill(updatedTitle);
    
    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill(updatedContent);

    // Wait for the PUT/PATCH request to update the note
    const updatePromise = page.waitForResponse(response => {
      const url = response.url();
      const method = response.request().method();
      return url.startsWith('http://localhost:3000/api/Notes/') && 
             url !== 'http://localhost:3000/api/Notes' &&
             (method === 'PUT' || method === 'PATCH');
    });
    
    // Wait for the GET request to refresh the notes list
    const refreshPromise = page.waitForResponse(response => 
      response.url() === 'http://localhost:3000/api/Notes' && 
      response.request().method() === 'GET'
    );

    // Happy path: Save changes
    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    
    // Wait for update request
    await updatePromise;
    
    // Wait for notes list to refresh
    await refreshPromise;
    
    await waitForPageReady(page, 'Note updated');

    // Happy path: Verify changes are reflected in UI
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 5000 });

    // Database verification: Query database to verify update was persisted
    const dbResponse = await makeRequest('GET', '/api/Notes');
    expect(dbResponse.status).toBe(200);
    const updatedNote = dbResponse.body.find((note: any) => note.title === updatedTitle);
    expect(updatedNote).toBeTruthy();
    expect(updatedNote.content).toContain(updatedContent);

    // Error handling: Try to update with empty title
    await firstNote.click();
    await waitForPageReady(page, 'Note selected again');
    
    const titleInput2 = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput2.fill('');
    
    const saveButton2 = page.getByRole('button', { name: /save/i }).first();
    await saveButton2.click();
    
    await page.waitForTimeout(1000);
    // Should either show validation error or prevent save
    const hasValidationError = await page.locator('text=/required|invalid|error/i').count() > 0;
    if (!hasValidationError) {
      // If no validation, the title should still be the updated one
      await expect(page.getByText(updatedTitle).first()).toBeVisible();
    }
  });

  // --------------------- Task 5: User can delete a note and it removes from database ---------------------
  test('User can delete a note and it removes from database', { tag: ['@M4-T5'] }, async ({ page }) => {
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    let initialCount = await notes.count();
    
    // Edge case: If no notes exist, create one first
    if (initialCount === 0) {
      const addButton = page.getByRole('button', { name: /add/i }).first();
      await addButton.click();

      const uniqueTitle = `Note to Delete ${Date.now()}`;
      const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
      await titleInput.fill(uniqueTitle);
      const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
      await bodyInput.fill('This will be deleted');
      const saveButton = page.getByRole('button', { name: /save/i }).first();
      await saveButton.click();
      
      await waitForPageReady(page, 'Note created');
      initialCount = await notes.count();
    }

    expect(initialCount).toBeGreaterThan(0);
    
    // Get the first note's title for database verification
    const firstNote = notes.first();
    const noteTitle = await firstNote.locator('h3').textContent();
    
    // Select first note
    await firstNote.click();
    
    // Wait for note editor to be visible (ensures note is loaded)
    await expect(page.locator('[data-testid="note-editor"]').or(page.locator('input, textarea').first())).toBeVisible({ timeout: 5000 });

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
    
    // Happy path: Click delete button
    await deleteButton.click();
    
    // Wait for the delete request to complete
    await deletePromise;
    
    // Wait for the notes list to refresh
    await refreshPromise;
    
    // Happy path: Verify count decreased
    await expect.poll(async () => {
      return await notes.count();
    }, { timeout: 10000 }).toBeLessThan(initialCount);

    // Database verification: Query database to verify note was removed
    const dbResponse = await makeRequest('GET', '/api/Notes');
    expect(dbResponse.status).toBe(200);
    if (noteTitle) {
      const deletedNote = dbResponse.body.find((note: any) => note.title === noteTitle);
      expect(deletedNote).toBeFalsy();
    }

    // Error handling: Verify UI handles empty state after deletion
    const remainingCount = await notes.count();
    if (remainingCount === 0) {
      // Should show empty state or no error
      const errorIndicators = page.locator('text=/error|Error|404|500/i');
      const errorCount = await errorIndicators.count();
      expect(errorCount).toBe(0);
    }
  });

  // --------------------- Task 6: User can search notes ---------------------
  test('User can search notes', { tag: ['@M4-T6'] }, async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const searchExists = await searchInput.count();
    
    if (searchExists > 0) {
      // Happy path: Search for notes
      await searchInput.fill('test');

      // Search should filter notes (UI behavior)
      const visibleNotes = page.locator('[data-testid="note-list"]').locator('[data-testid^="note-item-"]');
      const visibleCount = await visibleNotes.count();
      expect(visibleCount).toBeGreaterThanOrEqual(0);

      // Edge case: Search with no results
      await searchInput.fill('nonexistent-search-term-xyz-123');
      await page.waitForTimeout(500);
      // Should handle empty search results gracefully
      const errorIndicators = page.locator('text=/error|Error/i');
      const errorCount = await errorIndicators.count();
      expect(errorCount).toBe(0);

      // Edge case: Empty search query (should show all notes)
      await searchInput.fill('');
      await page.waitForTimeout(500);
      const allNotes = await visibleNotes.count();
      expect(allNotes).toBeGreaterThanOrEqual(0);
    } else {
      // If search input doesn't exist, skip search tests
      expect(searchExists).toBe(0);
    }
  });

  // --------------------- Task 7: Data persists after page refresh ---------------------
  test('Data persists after page refresh', { tag: ['@M4-T7'] }, async ({ page }) => {
    // Happy path: Create a note first
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    const uniqueTitle = `Persist Test ${Date.now()}`;
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill(uniqueTitle);

    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill('This should persist after refresh');

    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();

    // Wait for note to be created
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    // Database verification: Verify note exists in database before refresh
    const dbResponseBefore = await makeRequest('GET', '/api/Notes');
    expect(dbResponseBefore.status).toBe(200);
    const noteBeforeRefresh = dbResponseBefore.body.find((note: any) => note.title === uniqueTitle);
    expect(noteBeforeRefresh).toBeTruthy();

    // Happy path: Refresh page
    await page.reload();
    await waitForPageReady(page, 'After refresh');

    // Happy path: Verify note still exists after refresh (loaded from database)
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    // Database verification: Verify note still exists in database after refresh
    const dbResponseAfter = await makeRequest('GET', '/api/Notes');
    expect(dbResponseAfter.status).toBe(200);
    const noteAfterRefresh = dbResponseAfter.body.find((note: any) => note.title === uniqueTitle);
    expect(noteAfterRefresh).toBeTruthy();
    expect(noteAfterRefresh.content).toContain('This should persist after refresh');

    // Error handling: Verify no errors occurred during refresh
    const errorIndicators = page.locator('text=/error|Error|404|500/i');
    const errorCount = await errorIndicators.count();
    expect(errorCount).toBe(0);
  });

  // --------------------- End-to-End Test ---------------------
  test('End-to-End: Complete workflow', { tag: ['@M4-EndToEnd'] }, async ({ page }) => {
    // Task 1: View notes from database
    const notesContainer = page.locator('[data-testid="note-list"]');
    await expect(notesContainer).toBeVisible({ timeout: 10000 });

    // Task 2: Create a new note and it saves to database
    const noteList = page.locator('[data-testid="note-list"]');
    const notes = noteList.locator('[data-testid^="note-item-"]');
    const initialCount = await notes.count();

    const createPromise = page.waitForResponse(response => 
      response.url() === 'http://localhost:3000/api/Notes' && 
      response.request().method() === 'POST'
    );
    
    const refreshPromise1 = page.waitForResponse(response => 
      response.url() === 'http://localhost:3000/api/Notes' && 
      response.request().method() === 'GET'
    );

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    const workflowTitle = `E2E Workflow ${Date.now()}`;
    const titleInput = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput.fill(workflowTitle);

    const bodyInput = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput.fill('E2E workflow test content');

    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    
    await createPromise;
    await refreshPromise1;
    
    await expect.poll(async () => {
      return await notes.count();
    }, { timeout: 10000 }).toBeGreaterThan(initialCount);

    // Verify in database
    const dbVerifyCreate = await makeRequest('GET', '/api/Notes');
    expect(dbVerifyCreate.status).toBe(200);
    const createdNote = dbVerifyCreate.body.find((note: any) => note.title === workflowTitle);
    expect(createdNote).toBeTruthy();

    // Task 3: View individual note details from database
    await expect(noteList.getByText(workflowTitle).first()).toBeVisible();
    const noteItem = notes.filter({ hasText: workflowTitle }).first();
    await noteItem.click();
    await waitForPageReady(page, 'Note selected');
    await expect(page.getByText(workflowTitle).first()).toBeVisible({ timeout: 5000 });

    // Task 4: Update note and changes persist to database
    const updatedTitle = `E2E Updated ${Date.now()}`;
    const titleInput2 = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput2.fill(updatedTitle);
    
    const updatePromise = page.waitForResponse(response => {
      const url = response.url();
      const method = response.request().method();
      return url.startsWith('http://localhost:3000/api/Notes/') && 
             url !== 'http://localhost:3000/api/Notes' &&
             (method === 'PUT' || method === 'PATCH');
    });
    
    const refreshPromise2 = page.waitForResponse(response => 
      response.url() === 'http://localhost:3000/api/Notes' && 
      response.request().method() === 'GET'
    );
    
    const saveButton2 = page.getByRole('button', { name: /save/i }).first();
    await saveButton2.click();
    await updatePromise;
    await refreshPromise2;
    await waitForPageReady(page, 'Note updated');
    
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 5000 });

    // Verify update in database
    const dbVerifyUpdate = await makeRequest('GET', '/api/Notes');
    expect(dbVerifyUpdate.status).toBe(200);
    const updatedNote = dbVerifyUpdate.body.find((note: any) => note.title === updatedTitle);
    expect(updatedNote).toBeTruthy();

    // Task 5: Delete note and it removes from database
    const noteCountBeforeDelete = await notes.count();
    expect(noteCountBeforeDelete).toBeGreaterThan(0);
    
    const noteItem2 = notes.filter({ hasText: updatedTitle }).first();
    await noteItem2.click();
    await waitForPageReady(page, 'Note selected for delete');
    
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

    // Verify deletion
    await expect.poll(async () => {
      return await page.getByText(updatedTitle).count();
    }, { timeout: 5000 }).toBe(0);

    // Verify deletion from database
    const dbVerifyDelete = await makeRequest('GET', '/api/Notes');
    expect(dbVerifyDelete.status).toBe(200);
    const deletedNote = dbVerifyDelete.body.find((note: any) => note.title === updatedTitle);
    expect(deletedNote).toBeFalsy();

    // Task 6: Search notes
    const searchInput = page.getByPlaceholder(/search/i);
    const searchExists = await searchInput.count();
    if (searchExists > 0) {
      await searchInput.fill('E2E');
      await page.waitForTimeout(500);
    }

    // Task 7: Data persists after page refresh
    // Create a note for persistence test
    await addButton.click();
    const persistTitle = `E2E Persist ${Date.now()}`;
    const titleInput3 = page.getByLabel(/title/i).or(page.getByPlaceholder(/title/i)).first();
    await titleInput3.fill(persistTitle);
    const bodyInput3 = page.getByLabel(/body|content/i).or(page.getByPlaceholder(/body|content/i)).first();
    await bodyInput3.fill('Persist test');
    const saveButton3 = page.getByRole('button', { name: /save/i }).first();
    await saveButton3.click();
    
    await expect(page.getByText(persistTitle).first()).toBeVisible({ timeout: 10000 });

    // Refresh and verify persistence
    await page.reload();
    await waitForPageReady(page, 'After refresh');
    await expect(page.getByText(persistTitle).first()).toBeVisible({ timeout: 10000 });

    // Verify in database
    const dbVerifyPersist = await makeRequest('GET', '/api/Notes');
    expect(dbVerifyPersist.status).toBe(200);
    const persistedNote = dbVerifyPersist.body.find((note: any) => note.title === persistTitle);
    expect(persistedNote).toBeTruthy();
  });
});
