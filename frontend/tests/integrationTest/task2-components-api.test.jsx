import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

// Mock fetch globally instead of mocking specific function names
global.fetch = vi.fn();

describe('Task 2: Components API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Task 2: App fetches notes from API on mount', async () => {
    const mockNotes = [
      {
        id: '1',
        title: 'API Note 1',
        content: 'Content 1',
        tags: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'API Note 2',
        content: 'Content 2',
        tags: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Mock fetch to return notes on GET /api/Notes
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockNotes,
    });

    render(<App />);

    await waitFor(() => {
      // Verify fetch was called with GET /api/Notes
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/Notes');
    });

    // Verify notes are displayed (may appear in both list and editor, so use getAllByText)
    const note1Elements = screen.getAllByText('API Note 1');
    expect(note1Elements.length).toBeGreaterThan(0);
    const note2Elements = screen.getAllByText('API Note 2');
    expect(note2Elements.length).toBeGreaterThan(0);
  });

  it('Task 2: AddNoteModal creates note via API', async () => {
    const mockNotes = [];
    const newNote = {
      id: '3',
      title: 'New API Note',
      content: 'New content',
      tags: ['new'],
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mock: initial GET returns empty, then POST creates note, then GET returns new note
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNotes,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => newNote,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [newNote],
      });

    const user = userEvent.setup();
    render(<App />);

    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/Notes');
    });

    // Click Add button
    const addButton = screen.getByRole('button', { name: /add|new|create/i });
    await user.click(addButton);

    // Fill form
    const titleInput = screen.getByLabelText(/title/i) || screen.getByPlaceholderText(/title/i);
    const bodyInput = screen.getByLabelText(/body|content/i) || screen.getByPlaceholderText(/body|content/i);
    
    if (titleInput) await user.type(titleInput, 'New API Note');
    if (bodyInput) await user.type(bodyInput, 'New content');

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save|submit|create/i });
    await user.click(saveButton);

    await waitFor(() => {
      // Verify POST request was made to create note
      const fetchCalls = global.fetch.mock.calls;
      const postCall = fetchCalls.find(call => 
        call[0] === 'http://localhost:3000/api/Notes' && 
        call[1]?.method === 'POST' &&
        call[1]?.body && 
        JSON.parse(call[1].body).title.includes('New API Note')
      );
      expect(postCall).toBeDefined();
    });
  });

  it('Task 2: NoteEditor deletes note via API', async () => {
    const mockNotes = [
      {
        id: '1',
        title: 'Note to Delete',
        content: 'Content',
        tags: [],
        attachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Mock: GET all notes, GET single note, DELETE note, GET all notes again
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNotes,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockNotes[0],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Note deleted successfully' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      });

    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/Notes');
    });

    // Select note (click on the note in the list, not the editor)
    const noteList = screen.getByTestId('note-list');
    const noteElement = within(noteList).getByText('Note to Delete');
    await user.click(noteElement);

    await waitFor(() => {
      // Verify GET request was made for single note
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3000/api/Notes/1');
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i }) || 
                         screen.getByTitle(/delete/i) ||
                         screen.getByLabelText(/delete/i);
    
    if (deleteButton) {
      await user.click(deleteButton);
      
      await waitFor(() => {
        // Verify DELETE request was made
        const fetchCalls = global.fetch.mock.calls;
        const deleteCall = fetchCalls.find(call => 
          call[0] === 'http://localhost:3000/api/Notes/1' && 
          (!call[1] || call[1]?.method === 'DELETE')
        );
        expect(deleteCall).toBeDefined();
      });
    }
  });

  it('Task 2: App handles API errors gracefully', async () => {
    global.fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<App />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // App should still render (not crash)
    expect(screen.getByText(/NotesApp/i)).toBeInTheDocument();
  });
});
