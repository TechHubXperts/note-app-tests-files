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

test.describe('Milestone 2: Backend API Integration Tests', () => {
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

  // --------------------- Task 1: Backend server is running ---------------------
  test('Backend server is running', { tag: ['@M2-T1'] }, async () => {
    // Happy path: Server responds with 200
    const response = await makeRequest('GET', '/api/Notes');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Error handling: Verify server is actually responding (not cached error)
    const healthCheck = await makeRequest('GET', '/api/Notes');
    expect(healthCheck.status).toBe(200);
  });

  // --------------------- Task 2: Can create a note via API ---------------------
  test('Can create a note via API', { tag: ['@M2-T2'] }, async () => {
    // Happy path: Create a new note
    const newNote = {
      title: 'Integration Test Note',
      content: 'This is a test note for integration testing',
      tags: ['integration', 'test'],
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

    // Error handling: Try to create note with invalid data type
    const invalidTypeNote = {
      title: 12345, // Invalid: should be string
      content: 'Content',
    };
    const invalidTypeResponse = await makeRequest('POST', '/api/Notes', invalidTypeNote);
    expect([400, 500]).toContain(invalidTypeResponse.status);
  });

  // --------------------- Task 3: Can read notes via API ---------------------
  test('Can read notes via API', { tag: ['@M2-T3'] }, async () => {
    // First, create a note to read
    const newNote = {
      title: 'Note to Read',
      content: 'This note will be read',
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Happy path: Get all notes
    const getAllResponse = await makeRequest('GET', '/api/Notes');
    expect(getAllResponse.status).toBe(200);
    expect(Array.isArray(getAllResponse.body)).toBe(true);
    expect(getAllResponse.body.some((note: any) => note.id === noteId)).toBe(true);

    // Happy path: Get individual note
    const getIndividualResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getIndividualResponse.status).toBe(200);
    expect(getIndividualResponse.body.id).toBe(noteId);
    expect(getIndividualResponse.body.title).toBe(newNote.title);
    expect(getIndividualResponse.body.content).toBe(newNote.content);

    // Error handling: Get non-existent note (should return 404)
    const nonExistentResponse = await makeRequest('GET', '/api/Notes/nonexistent-id-12345');
    expect(nonExistentResponse.status).toBe(404);

    // Error handling: Get note with invalid ID format
    const invalidIdResponse = await makeRequest('GET', '/api/Notes/invalid-format-!!!');
    expect([404, 400]).toContain(invalidIdResponse.status);
  });

  // --------------------- Task 4: Can update a note via API ---------------------
  test('Can update a note via API', { tag: ['@M2-T4'] }, async () => {
    // First, create a note to update
    const newNote = {
      title: 'Original Title',
      content: 'Original content',
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Happy path: Update the note
    const updatedNote = {
      title: 'Updated Title',
      content: 'Updated content',
      tags: ['updated'],
    };
    const updateResponse = await makeRequest('PUT', `/api/Notes/${noteId}`, updatedNote);
    // Try PUT first, if not available, try PATCH
    let finalUpdateResponse = updateResponse;
    if (updateResponse.status === 404 || updateResponse.status === 405) {
      finalUpdateResponse = await makeRequest('PATCH', `/api/Notes/${noteId}`, updatedNote);
    }
    
    expect([200, 204]).toContain(finalUpdateResponse.status);
    
    // Verify update was successful
    const getResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.title).toBe(updatedNote.title);
    expect(getResponse.body.content).toBe(updatedNote.content);

    // Error handling: Update non-existent note (should return 404)
    const nonExistentUpdate = await makeRequest('PUT', '/api/Notes/nonexistent-id-12345', updatedNote);
    if (nonExistentUpdate.status === 405) {
      const patchResponse = await makeRequest('PATCH', '/api/Notes/nonexistent-id-12345', updatedNote);
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
  });

  // --------------------- Task 5: Can delete a note via API ---------------------
  test('Can delete a note via API', { tag: ['@M2-T5'] }, async () => {
    // First, create a note to delete
    const newNote = {
      title: 'Note to Delete',
      content: 'This note will be deleted',
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    const noteId = createResponse.body.id;

    // Happy path: Delete the note
    const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
    expect(deleteResponse.status).toBe(200);

    // Happy path: Verify note is deleted
    const getAfterDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getAfterDelete.status).toBe(404);

    // Error handling: Delete non-existent note (should return 404)
    const nonExistentDelete = await makeRequest('DELETE', '/api/Notes/nonexistent-id-12345');
    expect(nonExistentDelete.status).toBe(404);

    // Error handling: Delete with invalid ID format
    const invalidIdDelete = await makeRequest('DELETE', '/api/Notes/invalid-format-!!!');
    expect([404, 400]).toContain(invalidIdDelete.status);
  });

  // --------------------- End-to-End Test ---------------------
  test('End-to-End: Complete workflow', { tag: ['@M2-EndToEnd'] }, async () => {
    // Task 1: Backend server is running
    const serverResponse = await makeRequest('GET', '/api/Notes');
    expect(serverResponse.status).toBe(200);
    expect(Array.isArray(serverResponse.body)).toBe(true);

    // Task 2: Create a note
    const newNote = {
      title: 'E2E Test Note',
      content: 'End-to-end test content',
      tags: ['e2e', 'test'],
    };
    const createResponse = await makeRequest('POST', '/api/Notes', newNote);
    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toHaveProperty('id');
    const noteId = createResponse.body.id;
    createdNoteIds.push(noteId);

    // Task 3: Read the note
    const getResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.title).toBe(newNote.title);
    expect(getResponse.body.content).toBe(newNote.content);

    // Task 4: Update the note
    const updatedNote = {
      title: 'E2E Updated Note',
      content: 'Updated E2E content',
    };
    const updateResponse = await makeRequest('PUT', `/api/Notes/${noteId}`, updatedNote);
    let finalUpdateResponse = updateResponse;
    if (updateResponse.status === 404 || updateResponse.status === 405) {
      finalUpdateResponse = await makeRequest('PATCH', `/api/Notes/${noteId}`, updatedNote);
    }
    expect([200, 204]).toContain(finalUpdateResponse.status);

    // Verify update
    const getUpdatedResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getUpdatedResponse.status).toBe(200);
    expect(getUpdatedResponse.body.title).toBe(updatedNote.title);

    // Task 5: Delete the note
    const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
    expect(deleteResponse.status).toBe(200);

    // Verify deletion
    const getAfterDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getAfterDelete.status).toBe(404);

    // Remove from cleanup list since we already deleted it
    createdNoteIds = createdNoteIds.filter(id => id !== noteId);
  });
});
