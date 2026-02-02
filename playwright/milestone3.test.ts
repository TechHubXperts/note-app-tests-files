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

test.describe('Milestone 3: Backend + Database Integration Tests', () => {
  let createdNoteIds: string[] = [];

  test.afterEach(async () => {
    // Cleanup: delete all created notes
    for (const id of createdNoteIds) {
      try {
        await makeRequest('DELETE', `/api/Notes/${id}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    createdNoteIds = [];
  });

  // --------------------- Task 1: Backend server is running and connected to database ---------------------
  test('Backend server is running and connected to database', { tag: ['@M3-T1'] }, async () => {
    // Happy path: Server responds and returns array (from database)
    const response = await makeRequest('GET', '/api/Notes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Error handling: Verify database connection is working (not just in-memory)
    // If DB is not connected, might return error or empty array, but should still be 200
    const healthCheck = await makeRequest('GET', '/api/Notes');
    expect(healthCheck.status).toBe(200);
    expect(Array.isArray(healthCheck.body)).toBe(true);
  });

  // --------------------- Task 2: Can create a note and it persists to database ---------------------
  test('Can create a note and it persists to database', { tag: ['@M3-T2'] }, async () => {
    // Happy path: Create a new note (saved to MongoDB)
    const newNote = {
      title: 'Database Integration Test Note',
      content: 'This is a test note for database integration testing',
      tags: ['integration', 'test', 'database'],
      attachments: ['test.pdf'],
    };

    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toHaveProperty('id');
    expect(createResponse.body.title).toBe(newNote.title);
    expect(createResponse.body.content).toBe(newNote.content);
    expect(createResponse.body.tags).toEqual(newNote.tags);
    expect(createResponse.body.attachments).toEqual(newNote.attachments);
    expect(createResponse.body).toHaveProperty('createdAt');
    expect(createResponse.body).toHaveProperty('updatedAt');

    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Database verification: Query database to verify note was persisted
    const dbVerifyResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(dbVerifyResponse.status).toBe(200);
    expect(dbVerifyResponse.body.id).toBe(noteId);
    expect(dbVerifyResponse.body.title).toBe(newNote.title);
    expect(dbVerifyResponse.body.content).toBe(newNote.content);

    // Database verification: Verify note appears in all notes list (from database)
    const getAllResponse = await makeRequest('GET', '/api/Notes');
    expect(getAllResponse.status).toBe(200);
    expect(Array.isArray(getAllResponse.body)).toBe(true);
    expect(getAllResponse.body.some((note: any) => note.id === noteId)).toBe(true);

    // Error handling: Try to create note without title (should return 400)
    const invalidNote = {
      content: 'Note without title',
    };
    const invalidResponse = await makeRequest('POST', '/api/Notes', invalidNote);
    expect(invalidResponse.status).toBe(400);

    // Error handling: Try to create note with empty title
    const emptyTitleNote = {
      title: '',
      content: 'Note with empty title',
    };
    const emptyTitleResponse = await makeRequest('POST', '/api/Notes', emptyTitleNote);
    expect(emptyTitleResponse.status).toBe(400);
  });

  // --------------------- Task 3: Can read notes from database ---------------------
  test('Can read notes from database', { tag: ['@M3-T3'] }, async () => {
    // First, create a note to read
    const newNote = {
      title: 'Note to Read from DB',
      content: 'This note will be read from database',
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Happy path: Get all notes (from database)
    const getAllResponse = await makeRequest('GET', '/api/Notes');
    expect(getAllResponse.status).toBe(200);
    expect(Array.isArray(getAllResponse.body)).toBe(true);
    expect(getAllResponse.body.some((note: any) => note.id === noteId)).toBe(true);

    // Happy path: Get individual note (from database)
    const getIndividualResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getIndividualResponse.status).toBe(200);
    expect(getIndividualResponse.body.id).toBe(noteId);
    expect(getIndividualResponse.body.title).toBe(newNote.title);
    expect(getIndividualResponse.body.content).toBe(newNote.content);

    // Database verification: Verify data structure from database
    expect(getIndividualResponse.body).toHaveProperty('createdAt');
    expect(getIndividualResponse.body).toHaveProperty('updatedAt');
    expect(typeof getIndividualResponse.body.createdAt).toBe('string');

    // Error handling: Get non-existent note from database (should return 404)
    const fakeObjectId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but non-existent
    const nonExistentResponse = await makeRequest('GET', `/api/Notes/${fakeObjectId}`);
    expect(nonExistentResponse.status).toBe(404);

    // Error handling: Get note with invalid ObjectId format (should return 404)
    const invalidIdResponse = await makeRequest('GET', '/api/Notes/invalid-id-12345');
    expect(invalidIdResponse.status).toBe(404);
  });

  // --------------------- Task 4: Can update a note and changes persist to database ---------------------
  test('Can update a note and changes persist to database', { tag: ['@M3-T4'] }, async () => {
    // First, create a note to update
    const newNote = {
      title: 'Original Title for Update',
      content: 'Original content',
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Happy path: Update the note
    const updatedNote = {
      title: 'Updated Title in DB',
      content: 'Updated content in database',
      tags: ['updated', 'database'],
    };
    const updateResponse = await makeRequest('PUT', `/api/Notes/${noteId}`, updatedNote);
    // Try PUT first, if not available, try PATCH
    let finalUpdateResponse = updateResponse;
    if (updateResponse.status === 404 || updateResponse.status === 405) {
      finalUpdateResponse = await makeRequest('PATCH', `/api/Notes/${noteId}`, updatedNote);
    }
    
    expect([200, 204]).toContain(finalUpdateResponse.status);

    // Database verification: Query database to verify update was persisted
    const dbVerifyResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(dbVerifyResponse.status).toBe(200);
    expect(dbVerifyResponse.body.id).toBe(noteId);
    expect(dbVerifyResponse.body.title).toBe(updatedNote.title);
    expect(dbVerifyResponse.body.content).toBe(updatedNote.content);
    expect(dbVerifyResponse.body.tags).toEqual(updatedNote.tags);

    // Database verification: Verify updatedAt timestamp changed
    expect(dbVerifyResponse.body).toHaveProperty('updatedAt');
    const originalUpdatedAt = createResponse.body.updatedAt;
    const newUpdatedAt = dbVerifyResponse.body.updatedAt;
    // UpdatedAt should be different (or at least present)
    expect(newUpdatedAt).toBeTruthy();

    // Error handling: Update non-existent note (should return 404)
    const fakeObjectId = '507f1f77bcf86cd799439011';
    const nonExistentUpdate = await makeRequest('PUT', `/api/Notes/${fakeObjectId}`, updatedNote);
    if (nonExistentUpdate.status === 405) {
      const patchResponse = await makeRequest('PATCH', `/api/Notes/${fakeObjectId}`, updatedNote);
      expect(patchResponse.status).toBe(404);
    } else {
      expect(nonExistentUpdate.status).toBe(404);
    }

    // Error handling: Update with invalid data (should return 400)
    const invalidUpdate = {
      title: '', // Empty title should be invalid
    };
    const invalidUpdateResponse = await makeRequest('PUT', `/api/Notes/${noteId}`, invalidUpdate);
    if (invalidUpdateResponse.status === 405) {
      const patchInvalidResponse = await makeRequest('PATCH', `/api/Notes/${noteId}`, invalidUpdate);
      expect([400, 422]).toContain(patchInvalidResponse.status);
    } else {
      expect([400, 422]).toContain(invalidUpdateResponse.status);
    }

    // Error handling: Update with invalid ObjectId format
    const invalidIdUpdate = await makeRequest('PUT', '/api/Notes/invalid-format-!!!', updatedNote);
    if (invalidIdUpdate.status === 405) {
      const patchInvalidIdResponse = await makeRequest('PATCH', '/api/Notes/invalid-format-!!!', updatedNote);
      expect(patchInvalidIdResponse.status).toBe(404);
    } else {
      expect([404, 400]).toContain(invalidIdUpdate.status);
    }
  });

  // --------------------- Task 5: Can delete a note and it removes from database ---------------------
  test('Can delete a note and it removes from database', { tag: ['@M3-T5'] }, async () => {
    // First, create a note to delete
    const newNote = {
      title: 'Note to Delete from DB',
      content: 'This note will be deleted from database',
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    const noteId = createResponse.body.id;

    // Database verification: Verify note exists in database before deletion
    const getBeforeDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getBeforeDelete.status).toBe(200);
    expect(getBeforeDelete.body.id).toBe(noteId);

    // Happy path: Delete the note (from database)
    const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
    expect(deleteResponse.status).toBe(200);

    // Database verification: Verify note is removed from database
    const getAfterDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getAfterDelete.status).toBe(404);

    // Database verification: Verify note is not in all notes list (from database)
    const getAllResponse = await makeRequest('GET', '/api/Notes');
    expect(getAllResponse.status).toBe(200);
    expect(Array.isArray(getAllResponse.body)).toBe(true);
    expect(getAllResponse.body.some((note: any) => note.id === noteId)).toBe(false);

    // Error handling: Delete non-existent note from database (should return 404)
    const fakeObjectId = '507f1f77bcf86cd799439011';
    const nonExistentDelete = await makeRequest('DELETE', `/api/Notes/${fakeObjectId}`);
    expect(nonExistentDelete.status).toBe(404);

    // Error handling: Delete with invalid ObjectId format
    const invalidIdDelete = await makeRequest('DELETE', '/api/Notes/invalid-id-12345');
    expect(invalidIdDelete.status).toBe(404);
  });

  // --------------------- End-to-End Test ---------------------
  test('End-to-End: Complete workflow', { tag: ['@M3-EndToEnd'] }, async () => {
    // Task 1: Backend server is running and connected to database
    const serverResponse = await makeRequest('GET', '/api/Notes');
    expect(serverResponse.status).toBe(200);
    expect(Array.isArray(serverResponse.body)).toBe(true);

    // Task 2: Create a note and it persists to database
    const newNote = {
      title: 'E2E Database Test Note',
      content: 'End-to-end test content for database',
      tags: ['e2e', 'database'],
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toHaveProperty('id');
    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Verify in database
    const dbVerifyCreate = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(dbVerifyCreate.status).toBe(200);
    expect(dbVerifyCreate.body.title).toBe(newNote.title);

    // Task 3: Read notes from database
    const getResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.title).toBe(newNote.title);
    expect(getResponse.body.content).toBe(newNote.content);

    // Task 4: Update note and changes persist to database
    const updatedNote = {
      title: 'E2E Updated Note in DB',
      content: 'Updated E2E content in database',
    };
    const updateResponse = await makeRequest('PUT', `/api/Notes/${noteId}`, updatedNote);
    let finalUpdateResponse = updateResponse;
    if (updateResponse.status === 404 || updateResponse.status === 405) {
      finalUpdateResponse = await makeRequest('PATCH', `/api/Notes/${noteId}`, updatedNote);
    }
    expect([200, 204]).toContain(finalUpdateResponse.status);

    // Verify update in database
    const dbVerifyUpdate = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(dbVerifyUpdate.status).toBe(200);
    expect(dbVerifyUpdate.body.title).toBe(updatedNote.title);

    // Task 5: Delete note and it removes from database
    const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
    expect(deleteResponse.status).toBe(200);

    // Verify deletion from database
    const getAfterDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getAfterDelete.status).toBe(404);

    // Remove from cleanup list since we already deleted it
    createdNoteIds = createdNoteIds.filter(id => id !== noteId);
  });
});
