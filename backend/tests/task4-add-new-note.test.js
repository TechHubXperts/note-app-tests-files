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

test('Task 4: POST /api/Notes creates note with all fields', async () => {
  // Use unique identifier to avoid conflicts with other tests
  const uniqueId = Date.now();
  const newNote = {
    title: `Complete Test Note ${uniqueId}`,
    content: `This is a complete test note with all fields ${uniqueId}`,
    tags: ['important', 'test', 'backend'],
    attachments: ['file1.pdf', 'image.jpg'],
  };

  const response = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(response.status, 200);
  assert(response.body.id);
  assert.strictEqual(response.body.title, `Complete Test Note ${uniqueId}`);
  assert.strictEqual(response.body.content, `This is a complete test note with all fields ${uniqueId}`);
  assert.deepStrictEqual(response.body.tags, ['important', 'test', 'backend']);
  assert.deepStrictEqual(response.body.attachments, ['file1.pdf', 'image.jpg']);
  assert(response.body.createdAt);
  assert(response.body.updatedAt);
});

test('Task 4: POST /api/Notes creates note with minimal fields', async () => {
  // Use unique identifier to avoid conflicts with other tests
  const uniqueId = Date.now();
  const newNote = {
    title: `Minimal Note ${uniqueId}`,
  };

  const response = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(response.status, 200);
  assert(response.body.id);
  assert.strictEqual(response.body.title, `Minimal Note ${uniqueId}`);
  assert.strictEqual(response.body.content, '');
  assert.deepStrictEqual(response.body.tags, []);
  assert.deepStrictEqual(response.body.attachments, []);
  assert(response.body.createdAt);
  assert(response.body.updatedAt);
});

test('Task 4: POST /api/Notes returns 400 when title is missing', async () => {
  const newNote = {
    content: 'Note without title',
  };

  const response = await makeRequest('POST', '/api/Notes', newNote);
  assert.strictEqual(response.status, 400);
});

