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

test('Task 3: DELETE /api/Notes/:id deletes note successfully', async () => {
  // Setup: Create a note first (using POST - this is just setup, not what we're testing)
  const uniqueId = Date.now();
  const setupNote = {
    title: `Note to Delete ${uniqueId}`,
    content: `This note will be deleted ${uniqueId}`,
    tags: ['test', 'delete'],
    attachments: [],
  };
  const createResponse = await makeRequest('POST', '/api/Notes', setupNote);
  assert.strictEqual(createResponse.status, 200);
  const createdNote = createResponse.body;
  assert(createdNote.id);
  const noteId = createdNote.id;

  // Verify note exists before deletion
  const getBeforeDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
  assert.strictEqual(getBeforeDelete.status, 200);

  // Test: DELETE /api/Notes/:id - This is what we're actually testing
  const deleteResponse = await makeRequest('DELETE', `/api/Notes/${noteId}`);
  assert.strictEqual(deleteResponse.status, 200);
  assert(deleteResponse.body.message);

  // Verify note is deleted
  const getAfterDelete = await makeRequest('GET', `/api/Notes/${noteId}`);
  assert.strictEqual(getAfterDelete.status, 404);
});

test('Task 3: DELETE /api/Notes/:id returns 404 when note not found', async () => {
  const response = await makeRequest('DELETE', '/api/Notes/nonexistent-id-12345');
  assert.strictEqual(response.status, 404);
});

