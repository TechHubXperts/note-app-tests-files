import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../src/components/Sidebar';

describe('Task 1: Sidebar Component', () => {
  it('should render the app logo and name', () => {
    const mockOnAddNote = vi.fn();
    const mockOnSearchChange = vi.fn();
    
    render(
      <Sidebar
        onAddNote={mockOnAddNote}
        onSearchChange={mockOnSearchChange}
        searchQuery=""
      />
    );

    expect(screen.getByText('NotesApp')).toBeInTheDocument();
  });

  it('should render search input field', () => {
    const mockOnAddNote = vi.fn();
    const mockOnSearchChange = vi.fn();
    
    render(
      <Sidebar
        onAddNote={mockOnAddNote}
        onSearchChange={mockOnSearchChange}
        searchQuery=""
      />
    );

    const searchInput = screen.getByPlaceholderText('Search notes...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search input', async () => {
    const user = userEvent.setup();
    const mockOnAddNote = vi.fn();
    const mockOnSearchChange = vi.fn();
    
    render(
      <Sidebar
        onAddNote={mockOnAddNote}
        onSearchChange={mockOnSearchChange}
        searchQuery=""
      />
    );

    const searchInput = screen.getByPlaceholderText('Search notes...');
    await user.type(searchInput, 'test');

    expect(mockOnSearchChange).toHaveBeenCalled();
  });

  it('should render Add Note button', () => {
    const mockOnAddNote = vi.fn();
    const mockOnSearchChange = vi.fn();
    
    render(
      <Sidebar
        onAddNote={mockOnAddNote}
        onSearchChange={mockOnSearchChange}
        searchQuery=""
      />
    );

    const addButton = screen.getByText('Add Note');
    expect(addButton).toBeInTheDocument();
  });

  it('should call onAddNote when Add Note button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnAddNote = vi.fn();
    const mockOnSearchChange = vi.fn();
    
    render(
      <Sidebar
        onAddNote={mockOnAddNote}
        onSearchChange={mockOnSearchChange}
        searchQuery=""
      />
    );

    const addButton = screen.getByText('Add Note');
    await user.click(addButton);

    expect(mockOnAddNote).toHaveBeenCalledTimes(1);
  });

  it('should display search query value', () => {
    const mockOnAddNote = vi.fn();
    const mockOnSearchChange = vi.fn();
    
    render(
      <Sidebar
        onAddNote={mockOnAddNote}
        onSearchChange={mockOnSearchChange}
        searchQuery="test query"
      />
    );

    const searchInput = screen.getByPlaceholderText('Search notes...');
    expect(searchInput).toHaveValue('test query');
  });
});
