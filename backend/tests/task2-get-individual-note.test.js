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

test('Task 2: GET /api/Notes/:id returns note when found', async () => {
  // Setup: Create a note first (using POST - this is just setup, not what we're testing)
  // In a real scenario, notes would already exist
  const uniqueId = Date.now();
  const setupNote = {
    title: `Individual Test Note ${uniqueId}`,
    content: `Test content for individual note ${uniqueId}`,
    tags: ['test'],
    attachments: [],
  };
  const createResponse = await makeRequest('POST', '/api/Notes', setupNote);
  assert.strictEqual(createResponse.status, 200);
  const createdNote = createResponse.body;
  assert(createdNote.id);

  // Test: GET /api/Notes/:id - This is what we're actually testing
  const response = await makeRequest('GET', `/api/Notes/${createdNote.id}`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.id, createdNote.id);
  assert.strictEqual(response.body.title, `Individual Test Note ${uniqueId}`);
  assert.strictEqual(response.body.content, `Test content for individual note ${uniqueId}`);
  assert(Array.isArray(response.body.tags));
  assert(Array.isArray(response.body.attachments));
  assert(response.body.createdAt);
  assert(response.body.updatedAt);
});

test('Task 2: GET /api/Notes/:id returns 404 when note not found', async () => {
  const response = await makeRequest('GET', '/api/Notes/nonexistent-id-12345');
  assert.strictEqual(response.status, 404);
});

