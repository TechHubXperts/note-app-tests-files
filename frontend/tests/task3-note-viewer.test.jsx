import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteEditor from '../src/components/NoteEditor';

describe('Task 3: Note Viewer (Read-Only)', () => {
  const mockNote = {
    id: '1',
    title: 'Test Note Title',
    content: 'This is the note content',
    createdAt: '2023-10-26T10:00:00.000Z',
    updatedAt: '2023-10-26T11:30:00.000Z',
  };

  it('should display note title', () => {
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    expect(screen.getByText('Test Note Title')).toBeInTheDocument();
  });

  it('should display note content', () => {
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    expect(screen.getByText('This is the note content')).toBeInTheDocument();
  });

  it('should display creation date', () => {
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Created:/)).toBeInTheDocument();
  });

  it('should display last updated date', () => {
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('should render delete button', () => {
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByTitle('Delete note');
    expect(deleteButton).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    const deleteButton = screen.getByTitle('Delete note');
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should show empty state when no note is selected', () => {
    const mockOnDelete = vi.fn();
    
    render(<NoteEditor note={null} onDelete={mockOnDelete} />);

    expect(screen.getByText('Select a note to view or create a new one')).toBeInTheDocument();
  });

  it('should display "No content" for empty note content', () => {
    const mockOnDelete = vi.fn();
    const emptyNote = {
      ...mockNote,
      content: '',
    };
    
    render(<NoteEditor note={emptyNote} onDelete={mockOnDelete} />);

    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('should display "Untitled Note" when title is empty', () => {
    const mockOnDelete = vi.fn();
    const untitledNote = {
      ...mockNote,
      title: '',
    };
    
    render(<NoteEditor note={untitledNote} onDelete={mockOnDelete} />);

    expect(screen.getByText('Untitled Note')).toBeInTheDocument();
  });

  it('should not allow editing of title or content', () => {
    const mockOnDelete = vi.fn();
    
    const { container } = render(<NoteEditor note={mockNote} onDelete={mockOnDelete} />);

    const titleInput = container.querySelector('input');
    const contentTextarea = container.querySelector('textarea');

    expect(titleInput).not.toBeInTheDocument();
    expect(contentTextarea).not.toBeInTheDocument();
  });
});
