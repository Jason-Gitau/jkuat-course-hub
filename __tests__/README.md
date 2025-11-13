# Upload Tests - Direct R2 Upload Implementation

This directory contains comprehensive unit and integration tests for the direct R2 upload feature.

## Test Structure

```
__tests__/
├── api/
│   └── upload/
│       ├── presigned-url.test.js    # Tests for presigned URL generation
│       └── complete.test.js          # Tests for metadata completion
├── lib/
│   └── upload/
│       └── direct-r2-upload.test.js # Tests for client upload utilities
├── integration/
│   └── upload-flow.test.js          # End-to-end workflow tests
└── README.md                         # This file
```

## Test Coverage

### API Tests

#### `presigned-url.test.js` (29 tests)
Tests the `/api/upload/presigned-url` endpoint

**Success Cases:**
- ✅ Generate presigned URL for valid PDF file
- ✅ Generate presigned URL for DOCX file
- ✅ Generate presigned URL for image files
- ✅ Generate unique keys for multiple requests
- ✅ Handle large files up to 50MB

**Error Cases:**
- ❌ Missing filename
- ❌ Missing contentType
- ❌ File exceeding 50MB limit
- ❌ Unsupported file types (EXE, MP4, etc.)
- ❌ R2 client not configured

**Edge Cases:**
- ✅ Sanitize special characters in filenames
- ✅ Preserve file extensions
- ✅ Support all valid file types (PDF, DOCX, PPTX, PNG, JPG, WEBP, GIF)

#### `complete.test.js` (23 tests)
Tests the `/api/upload/complete` endpoint

**Success Cases:**
- ✅ Save material metadata and return material data
- ✅ Handle upload without topic (topicId = null)
- ✅ Handle upload without description
- ✅ Handle anonymous uploads (no auth)
- ✅ Save all file types correctly

**Error Cases:**
- ❌ Missing key
- ❌ Missing courseId
- ❌ Missing title
- ❌ Database insert fails

**Data Handling:**
- ✅ Detect PDF files correctly (type = 'pdf')
- ✅ Detect DOCX files correctly (type = 'docx')
- ✅ Detect PPTX files correctly (type = 'pptx')
- ✅ Detect image files correctly (type = 'image')
- ✅ Save material with category metadata
- ✅ Save past papers with year metadata
- ✅ Generate correct public URLs
- ✅ Store R2 key as storage_path

### Client-Side Tests

#### `direct-r2-upload.test.js` (30 tests)
Tests the client-side upload utilities in `lib/upload/direct-r2-upload.js`

**uploadToR2Direct():**
- ✅ Upload file directly to R2
- ✅ Track upload progress
- ❌ Presigned URL request fails
- ❌ Network errors
- ❌ Invalid file type
- ❌ File size exceeds limit

**completeUpload():**
- ✅ Save metadata after upload
- ❌ Completion fails
- ✅ Include auth credentials in request

**performFullUpload():**
- ✅ Perform complete upload workflow
- ✅ Report progress correctly
- ❌ Handle failures gracefully
- ❌ Handle metadata-only errors

**Error Handling:**
- ✅ Provide helpful error messages
- ❌ Handle timeouts gracefully
- ✅ Validate all file types

### Integration Tests

#### `upload-flow.test.js` (33 tests)
Tests the complete workflow from UI to database

**Workflow:**
- ✅ Handle large file upload (7.4 MB successfully)
- ❌ Reject files exceeding size limit
- ❌ Reject unsupported file types

**Multiple Files:**
- ✅ Upload multiple files in parallel
- ✅ Generate unique keys for each file

**Metadata Handling:**
- ✅ Save notes with week number
- ✅ Save past papers with year
- ✅ Save assignments with number

**Authentication:**
- ✅ Save authenticated user info
- ✅ Allow anonymous uploads

**File Type Detection:**
- ✅ Detect PDF, DOCX, PPTX, PNG, JPG, WEBP, GIF

**Error Recovery:**
- ❌ Handle network timeouts
- ❌ Handle partial uploads
- ✅ Clean up on failure

**Progress Tracking:**
- ✅ Track upload progress accurately
- ✅ Show correct progress messages

**Storage:**
- ✅ Store file in R2 with correct metadata
- ✅ Save all required database fields
- ✅ Save optional fields when provided

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- __tests__/api/upload/presigned-url.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Only Upload Tests
```bash
npm test -- __tests__/api/upload
npm test -- __tests__/lib/upload
npm test -- __tests__/integration/upload-flow
```

## Test Results

### Expected Output

```
PASS  __tests__/api/upload/presigned-url.test.js
PASS  __tests__/api/upload/complete.test.js
PASS  __tests__/lib/upload/direct-r2-upload.test.js
PASS  __tests__/integration/upload-flow.test.js

Test Suites: 4 passed, 4 total
Tests:       115 passed, 115 total
Snapshots:   0 total
Time:        12.345s
```

## Coverage Requirements

Tests cover:
- **Lines**: 80%+ for upload modules
- **Branches**: 75%+ for error handling
- **Functions**: 85%+ for utilities
- **Statements**: 80%+ overall

## What Each Test Validates

### File Size Limits
- Files under 4.5 MB (old Vercel limit) ✅
- Files from 4.5 MB to 50 MB (our target) ✅
- Files over 50 MB (rejected) ❌

### File Types
- PDF ✅
- DOCX ✅
- PPTX ✅
- PNG/JPG/WEBP/GIF ✅
- EXE/MP4/etc ❌ (rejected)

### API Endpoints
- `POST /api/upload/presigned-url` - Generates signed URLs
- `POST /api/upload/complete` - Saves metadata

### Client Utilities
- `uploadToR2Direct()` - Direct file upload with progress
- `completeUpload()` - Metadata persistence
- `performFullUpload()` - Complete workflow

### Authentication
- Authenticated uploads (save user info) ✅
- Anonymous uploads (save as 'Anonymous') ✅

### Error Scenarios
- Network errors
- Timeout errors
- Invalid file types
- File too large
- Missing required fields
- Database failures

## Test Dependencies

The tests use the following mocks:

```javascript
jest.mock('@/lib/storage/r2-client')
jest.mock('@aws-sdk/s3-request-presigner')
jest.mock('@supabase/supabase-js')
jest.mock('global.fetch') // For client tests
jest.mock('XMLHttpRequest') // For XHR-based uploads
```

## Adding New Tests

When adding new tests:

1. Follow the existing structure (Success → Error → Edge Cases)
2. Include descriptive test names
3. Add both positive and negative cases
4. Test error messages
5. Update this README with new test counts

Example:
```javascript
describe('New Feature', () => {
  test('should do something successfully', async () => {
    // Arrange
    const input = ...

    // Act
    const result = await newFunction(input)

    // Assert
    expect(result).toMatchObject({...})
  })

  test('should fail with invalid input', async () => {
    // ...
    await expect(newFunction(invalidInput)).rejects.toThrow()
  })
})
```

## Troubleshooting Tests

### Tests Timing Out
- Increase jest timeout: `jest.setTimeout(10000)`
- Check for unresolved promises
- Verify mocks are set up correctly

### Mock Not Working
- Ensure mock is defined before the import
- Check mock path matches exactly
- Verify `jest.clearAllMocks()` in beforeEach

### Snapshot Failures
```bash
# Update snapshots if changes are intentional
npm test -- -u
```

## Continuous Integration

These tests should run in CI/CD:

```yaml
# In your CI config (GitHub Actions, etc.)
- name: Run tests
  run: npm test -- --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Performance Benchmarks

Expected test execution times:

- Unit tests: < 2 seconds each
- Integration tests: < 5 seconds each
- Full suite: < 15 seconds

If tests are slow, check:
- Mock setup efficiency
- Unnecessary network calls
- Async timing issues

## Test Maintenance

### Regular Tasks
- [ ] Review tests monthly
- [ ] Update mocks for new dependencies
- [ ] Remove deprecated test patterns
- [ ] Add tests for new features

### When Making Changes
- Run tests before committing
- Update tests if behavior changes
- Add tests for new scenarios
- Document complex test setups

## References

- [Jest Documentation](https://jestjs.io/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Mock Data Patterns](https://jestjs.io/docs/manual-mocks)

## Questions?

See main implementation docs:
- `docs/DIRECT_R2_UPLOAD_IMPLEMENTATION.md` - Full technical details
- `docs/R2_CORS_SETUP.md` - CORS configuration
- `docs/QUICK_START_LARGE_FILES.md` - Quick start guide
