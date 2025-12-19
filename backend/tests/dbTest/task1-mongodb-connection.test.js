import { test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

test('Task 1: MongoDB connection can be established', async () => {
  // This test verifies that mongoose can connect to MongoDB
  // It should use MONGODB_URI from environment variable
  const mongoUri = process.env.MONGODB_URI;
  
  assert(mongoUri, 'MONGODB_URI environment variable must be set');
  assert(mongoUri.includes('mongodb'), 'MONGODB_URI should be a MongoDB connection string');
  
  // Try to connect
  try {
    await mongoose.connect(mongoUri);
    assert.strictEqual(mongoose.connection.readyState, 1, 'Connection should be established');
    
    // Disconnect after test
    await mongoose.disconnect();
  } catch (error) {
    assert.fail(`Failed to connect to MongoDB: ${error.message}`);
  }
});

test('Task 1: MongoDB connection handles invalid URI gracefully', async () => {
  // Test that connection errors are handled
  const invalidUri = 'mongodb://invalid-uri:27017/test';
  
  try {
    await mongoose.connect(invalidUri, { serverSelectionTimeoutMS: 2000 });
    assert.fail('Should have thrown an error for invalid URI');
  } catch (error) {
    // Expected to fail
    assert(error, 'Should throw an error for invalid connection string');
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

