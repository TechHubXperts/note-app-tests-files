import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

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

test('Task 1: GET /api/Notes returns array with valid structure', async () => {
  const response = await makeRequest('GET', '/api/Notes');
  assert.strictEqual(response.status, 200);
  assert(Array.isArray(response.body));
  // Verify array structure - if notes exist, they should have required fields
  if (response.body.length > 0) {
    const firstNote = response.body[0];
    assert(firstNote.hasOwnProperty('id'));
    assert(firstNote.hasOwnProperty('title'));
    assert(firstNote.hasOwnProperty('content'));
    assert(firstNote.hasOwnProperty('tags'));
    assert(firstNote.hasOwnProperty('attachments'));
    assert(firstNote.hasOwnProperty('createdAt'));
    assert(firstNote.hasOwnProperty('updatedAt'));
  }
});

test('Task 1: GET /api/Notes returns all notes with correct format', async () => {
  // This test assumes notes may already exist from other sources
  // We're only testing that GET /api/Notes returns them correctly
  const response = await makeRequest('GET', '/api/Notes');
  assert.strictEqual(response.status, 200);
  assert(Array.isArray(response.body));
  // Verify all returned items are valid note objects
  response.body.forEach(note => {
    assert(note.hasOwnProperty('id'));
    assert(note.hasOwnProperty('title'));
    assert(note.hasOwnProperty('content'));
    assert(note.hasOwnProperty('tags'));
    assert(note.hasOwnProperty('attachments'));
    assert(note.hasOwnProperty('createdAt'));
    assert(note.hasOwnProperty('updatedAt'));
  });
});

