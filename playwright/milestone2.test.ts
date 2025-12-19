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

  test('Backend server is running', async () => {
    const response = await makeRequest('GET', '/api/Notes');
    expect(response.status).toBe(200);
  });

  test('Complete CRUD workflow', async () => {
    // 1. Create a new note
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

    // 2. Get all notes and verify the new note is in the list
    const getAllResponse = await makeRequest('GET', '/api/Notes');
    expect(getAllResponse.status).toBe(200);
    expect(Array.isArray(getAllResponse.body)).toBe(true);
    expect(getAllResponse.body.some((note: any) => note.id === noteId)).toBe(true);

    // 3. Get individual note
    const getIndividualResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getIndividualResponse.status).toBe(200);
    expect(getIndividualResponse.body.id).toBe(noteId);
    expect(getIndividualResponse.body.title).toBe(newNote.title);

    // 4. Delete the note
    const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
    expect(deleteResponse.status).toBe(200);

    // 5. Verify note is deleted
    const getAfterDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
    expect(getAfterDelete.status).toBe(404);

    // Remove from cleanup list since we already deleted it
    createdNoteIds = createdNoteIds.filter(id => id !== noteId);
  });

  test('Error handling - get non-existent note', async () => {
    const response = await makeRequest('GET', '/api/Notes/nonexistent-id-12345');
    expect(response.status).toBe(404);
  });

  test('Error handling - delete non-existent note', async () => {
    const response = await makeRequest('DELETE', '/api/Notes/nonexistent-id-12345');
    expect(response.status).toBe(404);
  });

  test('Error handling - create note without title', async () => {
    const response = await makeRequest('POST', '/api/Notes', {
      content: 'Note without title',
    });
    expect(response.status).toBe(400);
  });

  test('Multiple notes workflow', async () => {
    // Create multiple notes
    const note1 = await makeRequest('POST', '/api/Notes', {
      title: 'Note 1',
      content: 'First note',
    });
    const note2 = await makeRequest('POST', '/api/Notes', {
      title: 'Note 2',
      content: 'Second note',
    });
    const note3 = await makeRequest('POST', '/api/Notes', {
      title: 'Note 3',
      content: 'Third note',
    });

    expect(note1.status).toBe(200);
    expect(note2.status).toBe(200);
    expect(note3.status).toBe(200);

    createdNoteIds.push(note1.body.id, note2.body.id, note3.body.id);

    // Get all notes and verify count
    const getAllResponse = await makeRequest('GET', '/api/Notes');
    expect(getAllResponse.status).toBe(200);
    expect(getAllResponse.body.length).toBeGreaterThanOrEqual(3);

    // Verify all three notes are present
    const noteIds = getAllResponse.body.map((note: any) => note.id);
    expect(noteIds).toContain(note1.body.id);
    expect(noteIds).toContain(note2.body.id);
    expect(noteIds).toContain(note3.body.id);
  });
});

