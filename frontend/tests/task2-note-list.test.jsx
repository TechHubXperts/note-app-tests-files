import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteList from '../src/components/NoteList';

describe('Task 2: Note List Display', () => {
  const mockNotes = [
    {
      id: '1',
      title: 'Test Note 1',
      content: 'This is the content of test note 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Test Note 2',
      content: 'This is the content of test note 2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('should render list of notes', () => {
    const mockOnSelectNote = vi.fn();
    
    render(
      <NoteList
        notes={mockNotes}
        selectedNoteId={null}
        onSelectNote={mockOnSelectNote}
        searchQuery=""
      />
    );

    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.getByText('Test Note 2')).toBeInTheDocument();
  });

  it('should display note content preview', () => {
    const mockOnSelectNote = vi.fn();
    
    render(
      <NoteList
        notes={mockNotes}
        selectedNoteId={null}
        onSelectNote={mockOnSelectNote}
        searchQuery=""
      />
    );

    expect(screen.getByText(/This is the content of test note 1/)).toBeInTheDocument();
  });

  it('should highlight selected note', () => {
    const mockOnSelectNote = vi.fn();
    
    const { container } = render(
      <NoteList
        notes={mockNotes}
        selectedNoteId="1"
        onSelectNote={mockOnSelectNote}
        searchQuery=""
      />
    );

    const selectedNote = container.querySelector('.bg-purple-100');
    expect(selectedNote).toBeInTheDocument();
    expect(selectedNote).toHaveTextContent('Test Note 1');
  });

  it('should call onSelectNote when note is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSelectNote = vi.fn();
    
    render(
      <NoteList
        notes={mockNotes}
        selectedNoteId={null}
        onSelectNote={mockOnSelectNote}
        searchQuery=""
      />
    );

    const note1 = screen.getByText('Test Note 1').closest('div');
    await user.click(note1);

    expect(mockOnSelectNote).toHaveBeenCalledWith('1');
  });

  it('should filter notes based on search query', () => {
    const mockOnSelectNote = vi.fn();
    
    render(
      <NoteList
        notes={mockNotes}
        selectedNoteId={null}
        onSelectNote={mockOnSelectNote}
        searchQuery="Note 1"
      />
    );

    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Note 2')).not.toBeInTheDocument();
  });

  it('should show "No notes found" when no notes match search', () => {
    const mockOnSelectNote = vi.fn();
    
    render(
      <NoteList
        notes={mockNotes}
        selectedNoteId={null}
        onSelectNote={mockOnSelectNote}
        searchQuery="nonexistent"
      />
    );

    expect(screen.getByText('No notes found')).toBeInTheDocument();
  });

  it('should handle empty notes array', () => {
    const mockOnSelectNote = vi.fn();
    
    render(
      <NoteList
        notes={[]}
        selectedNoteId={null}
        onSelectNote={mockOnSelectNote}
        searchQuery=""
      />
    );

    expect(screen.getByText('No notes found')).toBeInTheDocument();
  });
});
