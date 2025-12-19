# Note App - Test Files Repository

This repository contains **ONLY test files** for the Note App project. This repository is used in CI/CD pipelines to test student implementations.

## ⚠️ Important

This repository contains:
- ✅ Subtask tests (unit tests for individual tasks)
- ✅ Milestone tests (end-to-end tests)
- ✅ Test configuration files
- ✅ Test utilities and setup files

This repository does **NOT** contain:
- ❌ Application implementation code
- ❌ Controllers, services, routes
- ❌ React components
- ❌ Server files

## Project Structure

```
note-app-test-files/
├── frontend/
│   ├── tests/              # Frontend unit tests (task-level)
│   │   ├── integrationTest/ # Integration tests
│   │   └── setup.js        # Test setup file
│   ├── vitest.config.js    # Vitest test configuration
│   └── package.json        # Test dependencies only
├── backend/
│   ├── tests/              # Backend tests
│   │   ├── dbTest/         # Database tests
│   │   └── task*.test.js   # API endpoint tests
│   └── package.json        # Test dependencies only
└── playwright/             # End-to-end tests (milestone-level)
    ├── milestone1.test.ts  # Milestone 1 E2E tests
    ├── milestone2.test.ts  # Milestone 2 E2E tests
    ├── milestone3.test.ts  # Milestone 3 E2E tests
    ├── milestone4.test.ts  # Milestone 4 E2E tests
    ├── playwright.config.ts
    └── package.json
```

## Test Files

### Frontend Tests
- `frontend/tests/task1-sidebar.test.jsx` - Sidebar component tests
- `frontend/tests/task2-note-list.test.jsx` - Note list component tests
- `frontend/tests/task3-note-viewer.test.jsx` - Note viewer component tests
- `frontend/tests/task4-add-note-modal.test.jsx` - Add note modal tests
- `frontend/tests/integrationTest/task1-api-service.test.jsx` - API service tests
- `frontend/tests/integrationTest/task2-components-api.test.jsx` - Component API integration tests

### Backend Tests
- `backend/tests/task1-get-notes.test.js` - GET all notes endpoint tests
- `backend/tests/task2-get-individual-note.test.js` - GET single note endpoint tests
- `backend/tests/task3-delete-note.test.js` - DELETE note endpoint tests
- `backend/tests/task4-add-new-note.test.js` - POST new note endpoint tests
- `backend/tests/dbTest/task1-mongodb-connection.test.js` - MongoDB connection tests
- `backend/tests/dbTest/task2-note-model.test.js` - Note model/schema tests
- `backend/tests/dbTest/task3-database-crud.test.js` - Database CRUD operation tests

### E2E Tests (Playwright)
- `playwright/milestone1.test.ts` - Milestone 1 E2E tests
- `playwright/milestone2.test.ts` - Milestone 2 E2E tests
- `playwright/milestone3.test.ts` - Milestone 3 E2E tests
- `playwright/milestone4.test.ts` - Milestone 4 E2E tests

## Usage

This repository is designed to be used in CI/CD pipelines. Tests are copied into student repositories and run against student implementations.

### Running Tests

**Frontend Tests:**
```bash
cd frontend
npm install
npm test
```

**Backend Tests:**
```bash
cd backend
npm install
npm test
```

**E2E Tests:**
```bash
cd playwright
npm install
npm test
```

## Test Paths

Tests must remain in their designated paths:
- Backend: `backend/**/tests` or `backend/**/__tests__`
- Frontend: `frontend/**/tests` or `frontend/**/__tests__`

Do not move or rename test paths.
