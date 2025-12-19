import { test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import http from 'node:http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

test('Task 3: GET /api/Notes fetches from MongoDB', async () => {
  const uniqueId = Date.now();
  const newNote = {
    title: `Database Test Note ${uniqueId}`,
    content: `Test content ${uniqueId}`,
    tags: ['test', 'database'],
    attachments: [],
  };
  
  // Create a note first
  const createResponse = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(createResponse.status, 200);
  const createdNote = createResponse.body;
  assert(createdNote.id);
  
  // Get all notes
  const getAllResponse = await makeRequest('GET', '/api/Notes');
  assert.strictEqual(getAllResponse.status, 200);
  assert(Array.isArray(getAllResponse.body));
  assert(getAllResponse.body.some(note => note.id === createdNote.id));
  
  // Cleanup
  await makeRequest('DELETE', `/api/Notes/${createdNote.id}`);
});

test('Task 3: GET /api/Notes/:id fetches from MongoDB by ObjectId', async () => {
  const uniqueId = Date.now();
  const newNote = {
    title: `Individual DB Test ${uniqueId}`,
    content: `Content ${uniqueId}`,
    tags: ['test'],
    attachments: [],
  };
  
  const createResponse = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(createResponse.status, 200);
  const noteId = createResponse.body.id;
  
  // Get individual note
  const getResponse = await makeRequest('GET', `/api/Notes/${noteId}`);
  assert.strictEqual(getResponse.status, 200);
  assert.strictEqual(getResponse.body.id, noteId);
  assert.strictEqual(getResponse.body.title, `Individual DB Test ${uniqueId}`);
  
  // Cleanup
  await makeRequest('DELETE', `/api/Notes/${noteId}`);
});

test('Task 3: POST /api/Notes saves to MongoDB', async () => {
  const uniqueId = Date.now();
  const newNote = {
    title: `Save to DB ${uniqueId}`,
    content: `Database content ${uniqueId}`,
    tags: ['save', 'test'],
    attachments: ['file.pdf'],
  };
  
  const response = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(response.status, 200);
  assert(response.body.id);
  assert.strictEqual(response.body.title, `Save to DB ${uniqueId}`);
  assert.strictEqual(response.body.content, `Database content ${uniqueId}`);
  assert.deepStrictEqual(response.body.tags, ['save', 'test']);
  assert.deepStrictEqual(response.body.attachments, ['file.pdf']);
  assert(response.body.createdAt);
  assert(response.body.updatedAt);
  
  // Verify it's persisted by fetching again
  const getResponse = await makeRequest('GET', `/api/Notes/${response.body.id}`);
  assert.strictEqual(getResponse.status, 200);
  assert.strictEqual(getResponse.body.title, `Save to DB ${uniqueId}`);
  
  // Cleanup
  await makeRequest('DELETE', `/api/Notes/${response.body.id}`);
});

test('Task 3: DELETE /api/Notes/:id deletes from MongoDB', async () => {
  const uniqueId = Date.now();
  const newNote = {
    title: `Delete Test ${uniqueId}`,
    content: `Will be deleted ${uniqueId}`,
    tags: ['delete'],
    attachments: [],
  };
  
  const createResponse = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(createResponse.status, 200);
  const noteId = createResponse.body.id;
  
  // Verify it exists
  const getBefore = await makeRequest('GET', `/api/Notes/${noteId}`);
  assert.strictEqual(getBefore.status, 200);
  
  // Delete it
  const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
  assert.strictEqual(deleteResponse.status, 200);
  
  // Verify it's deleted
  const getAfter = await makeRequest('GET', `/api/Notes/${noteId}`);
  assert.strictEqual(getAfter.status, 404);
});

test('Task 3: Invalid ObjectId returns 404', async () => {
  const response = await makeRequest('GET', '/api/Notes/invalid-object-id-123');
  assert.strictEqual(response.status, 404);
});

