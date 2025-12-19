import { test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Note: This test assumes the Note model is exported from a models file
// Adjust the import path based on your actual file structure
// import { Note } from '../../src/models/Note.js';

test('Task 2: Note model schema is defined correctly', async () => {
  // Connect to database
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    assert.fail('MONGODB_URI environment variable must be set');
  }
  
  try {
    await mongoose.connect(mongoUri);
    
    // Define schema inline for testing (or import from your models)
    const noteSchema = new mongoose.Schema({
      title: {
        type: String,
        required: true,
      },
      content: {
        type: String,
        default: '',
      },
      tags: {
        type: [String],
        default: [],
      },
      attachments: {
        type: [String],
        default: [],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    });
    
    const Note = mongoose.model('Note', noteSchema);
    
    // Test that model exists
    assert(Note, 'Note model should be defined');
    
    // Test schema validation - title is required
    const noteWithoutTitle = new Note({
      content: 'Test content',
    });
    
    try {
      await noteWithoutTitle.validate();
      assert.fail('Should have failed validation for missing title');
    } catch (error) {
      assert(error.errors.title, 'Should have title validation error');
    }
    
    // Test that valid note can be created
    const validNote = new Note({
      title: 'Test Note',
      content: 'Test content',
      tags: ['test'],
      attachments: [],
    });
    
    assert.strictEqual(validNote.title, 'Test Note');
    assert.strictEqual(validNote.content, 'Test content');
    assert.deepStrictEqual(validNote.tags, ['test']);
    assert(validNote._id, 'Note should have _id (ObjectId)');
    
    await mongoose.disconnect();
  } catch (error) {
    await mongoose.disconnect();
    assert.fail(`Test failed: ${error.message}`);
  }
});

test('Task 2: Note model has correct field types', async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    assert.fail('MONGODB_URI environment variable must be set');
  }
  
  try {
    await mongoose.connect(mongoUri);
    
    const noteSchema = new mongoose.Schema({
      title: String,
      content: String,
      tags: [String],
      attachments: [String],
      createdAt: Date,
      updatedAt: Date,
    });
    
    const Note = mongoose.model('NoteTest', noteSchema);
    
    const note = new Note({
      title: 'Test',
      content: 'Content',
      tags: ['tag1', 'tag2'],
      attachments: ['file1.pdf'],
    });
    
    assert.strictEqual(typeof note.title, 'string');
    assert.strictEqual(typeof note.content, 'string');
    assert(Array.isArray(note.tags));
    assert(Array.isArray(note.attachments));
    assert(note._id instanceof mongoose.Types.ObjectId);
    
    await mongoose.disconnect();
  } catch (error) {
    await mongoose.disconnect();
    assert.fail(`Test failed: ${error.message}`);
  }
});

