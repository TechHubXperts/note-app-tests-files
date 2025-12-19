import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddNoteModal from '../src/components/AddNoteModal';

describe('Task 4: Add Note Modal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <AddNoteModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Add New Note')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Add New Note')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Body')).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/)).toBeInTheDocument();
    expect(screen.getByLabelText('Attachments')).toBeInTheDocument();
  });

  it('should render Cancel and Save Note buttons', () => {
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Note')).toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button (X) is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should require title field', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save Note');
    await user.click(saveButton);

    const titleInput = screen.getByLabelText('Title');
    expect(titleInput).toBeRequired();
  });

  it('should call onSave with note data when form is submitted', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const bodyInput = screen.getByLabelText('Body');
    const tagsInput = screen.getByLabelText(/Tags/);

    await user.type(titleInput, 'New Note');
    await user.type(bodyInput, 'Note content');
    await user.type(tagsInput, 'important, work');

    const saveButton = screen.getByText('Save Note');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith({
      title: 'New Note',
      content: 'Note content',
      tags: ['important', 'work'],
      attachments: [],
    });
  });

  it('should display character counter for body field', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const bodyInput = screen.getByLabelText('Body');
    await user.type(bodyInput, 'test');

    expect(screen.getByText('4/500 characters')).toBeInTheDocument();
  });

  it('should limit body input to 500 characters', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const bodyInput = screen.getByLabelText('Body');
    const longText = 'a'.repeat(600);
    
    await user.type(bodyInput, longText);

    expect(bodyInput).toHaveValue('a'.repeat(500));
    expect(screen.getByText('500/500 characters')).toBeInTheDocument();
  });

  it('should reset form fields when closed', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    await user.type(titleInput, 'Test');
    expect(titleInput).toHaveValue('Test');

    // Close the modal
    rerender(
      <AddNoteModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Reopen the modal - fields should be reset
    rerender(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Wait for the modal to render and check the value
    const newTitleInput = await screen.findByLabelText('Title');
    expect(newTitleInput).toHaveValue('');
  });

  it('should parse tags correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const titleInput = screen.getByLabelText('Title');
    const tagsInput = screen.getByLabelText(/Tags/);

    await user.type(titleInput, 'Test Note');
    await user.type(tagsInput, 'tag1, tag2 , tag3');

    const saveButton = screen.getByText('Save Note');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['tag1', 'tag2', 'tag3'],
      })
    );
  });

  it('should close modal when clicking outside', () => {
    render(
      <AddNoteModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Since the modal uses a portal, the backdrop is in document.body
    // Find the backdrop element (the outer div with fixed positioning)
    const backdrop = document.body.querySelector('.fixed.inset-0');
    expect(backdrop).toBeTruthy();
    
    if (backdrop) {
      // Create a click event where target === currentTarget (clicking backdrop itself)
      const clickEvent = {
        target: backdrop,
        currentTarget: backdrop,
        bubbles: true,
        cancelable: true,
        stopPropagation: vi.fn(),
        preventDefault: vi.fn(),
      };
      
      // Fire the click event on the backdrop
      fireEvent.click(backdrop, clickEvent);
    }

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
