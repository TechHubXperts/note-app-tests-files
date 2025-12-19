import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('Task 1: API Service Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Task 1: API service fetches all notes from /api/Notes', async () => {
    const mockNotes = [
      {
        id: '1',
        title: 'Test Note',
        content: 'Test content',
        tags: ['test'],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockNotes,
    });

    // Import the API service module (test behavior, not specific function names)
    const apiModule = await import('../../src/utils/api.js');
    
    // Find the function that makes GET request to /api/Notes (function with 0 parameters)
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function');
    const getAllFunction = exportedFunctions.find(fn => fn.length === 0);
    
    expect(getAllFunction).toBeDefined();
    const notes = await getAllFunction();
    
    // Verify it made GET request to /api/Notes
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/Notes');
    expect(notes).toEqual(mockNotes);
    expect(Array.isArray(notes)).toBe(true);
  });

  it('Task 1: API service fetches single note from /api/Notes/:id', async () => {
    const mockNote = {
      id: '123',
      title: 'Individual Note',
      content: 'Content',
      tags: [],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockNote,
    });

    const apiModule = await import('../../src/utils/api.js');
    
    // Find function that takes one parameter (id) - should make GET to /api/Notes/:id
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function' && fn.length === 1);
    expect(exportedFunctions.length).toBeGreaterThan(0);
    
    // Try functions until we find one that makes GET to /api/Notes/:id
    let found = false;
    for (const getByIdFunction of exportedFunctions) {
      vi.clearAllMocks();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNote,
      });
      
      try {
        const note = await getByIdFunction('123');
        const fetchCalls = global.fetch.mock.calls;
        const getCall = fetchCalls.find(call => 
          call[0] === 'http://localhost:3000/api/Notes/123'
        );
        if (getCall && (!getCall[1] || !getCall[1].method || getCall[1].method === 'GET')) {
          expect(note).toEqual(mockNote);
          expect(note.id).toBe('123');
          found = true;
          break;
        }
      } catch (e) {
        // Try next function
        continue;
      }
    }
    expect(found).toBe(true);
  });

  it('Task 1: API service creates note via POST /api/Notes', async () => {
    const newNoteData = {
      title: 'New Note',
      content: 'New content',
      tags: ['new'],
      attachments: [],
    };

    const createdNote = {
      id: '456',
      ...newNoteData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => createdNote,
    });

    const apiModule = await import('../../src/utils/api.js');
    
    // Find function that takes an object parameter (note data) - should make POST
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function' && fn.length === 1);
    expect(exportedFunctions.length).toBeGreaterThan(0);
    
    // Try functions until we find one that makes POST request
    let found = false;
    for (const createFunction of exportedFunctions) {
      vi.clearAllMocks();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => createdNote,
      });
      
      try {
        const result = await createFunction(newNoteData);
        const fetchCalls = global.fetch.mock.calls;
        const postCall = fetchCalls.find(call => 
          call[0] === 'http://localhost:3000/api/Notes' && 
          call[1]?.method === 'POST' &&
          call[1]?.body && 
          JSON.parse(call[1].body).title === newNoteData.title
        );
        if (postCall) {
          expect(result).toEqual(createdNote);
          expect(result.id).toBe('456');
          found = true;
          break;
        }
      } catch (e) {
        // Try next function
        continue;
      }
    }
    expect(found).toBe(true);
  });

  it('Task 1: API service deletes note via DELETE /api/Notes/:id', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Note deleted successfully' }),
    });

    const apiModule = await import('../../src/utils/api.js');
    
    // Find function that takes one string parameter (id) and makes DELETE
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function' && fn.length === 1);
    expect(exportedFunctions.length).toBeGreaterThan(0);
    
    // Try functions until we find one that makes DELETE request
    let found = false;
    for (const deleteFunction of exportedFunctions) {
      vi.clearAllMocks();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Note deleted successfully' }),
      });
      
      try {
        await deleteFunction('789');
        const fetchCalls = global.fetch.mock.calls;
        const deleteCall = fetchCalls.find(call => 
          call[0] === 'http://localhost:3000/api/Notes/789' && 
          (!call[1] || call[1]?.method === 'DELETE')
        );
        if (deleteCall) {
          found = true;
          break;
        }
      } catch (e) {
        // Try next function
        continue;
      }
    }
    expect(found).toBe(true);
  });

  it('Task 1: API service handles network errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const apiModule = await import('../../src/utils/api.js');
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function' && fn.length === 0);
    expect(exportedFunctions.length).toBeGreaterThan(0);
    
    const getAllFunction = exportedFunctions[0];
    await expect(getAllFunction()).rejects.toThrow();
  });

  it('Task 1: API service handles 404 errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Note not found' }),
    });

    const apiModule = await import('../../src/utils/api.js');
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function' && fn.length === 1);
    expect(exportedFunctions.length).toBeGreaterThan(0);
    
    const getByIdFunction = exportedFunctions[0];
    await expect(getByIdFunction('nonexistent')).rejects.toThrow();
  });

  it('Task 1: API service handles 500 errors', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    const apiModule = await import('../../src/utils/api.js');
    const exportedFunctions = Object.values(apiModule).filter(fn => typeof fn === 'function' && fn.length === 0);
    expect(exportedFunctions.length).toBeGreaterThan(0);
    
    const getAllFunction = exportedFunctions[0];
    await expect(getAllFunction()).rejects.toThrow();
  });
});
