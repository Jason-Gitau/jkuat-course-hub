# Unit Testing Guide for PLG Features

This document provides a comprehensive guide for running and maintaining unit tests for the JKUAT Course Hub PLG (Product-Led Growth) implementation.

## Test Coverage Overview

We have implemented **93+ unit tests** covering all critical PLG features:

### Test Files Created

1. **lib/utils/__tests__/courseValidation.test.js** (20 tests)
   - Tests for course name formatting
   - Course validation rules
   - Fuzzy matching for similar courses
   - Duplicate detection
   - Department suggestions

2. **lib/utils/__tests__/inviteLinkGenerator.test.js** (15 tests)
   - Invite code generation
   - Invite link creation and parsing
   - Social share text generation
   - WhatsApp and Telegram URL generation

3. **lib/hooks/__tests__/useOnboarding.test.js** (10 tests)
   - Onboarding state management
   - localStorage persistence
   - Tour completion tracking
   - State reset functionality

4. **components/onboarding/__tests__/SmartCourseSelector.test.js** (15 tests)
   - Course selection UI
   - Autocomplete functionality
   - Course creation modal
   - Validation and error handling

5. **components/onboarding/__tests__/InviteClassmatesModal.test.js** (12 tests)
   - QR code generation
   - Invite link display and copying
   - Social sharing (WhatsApp, Telegram)
   - Modal interactions

6. **components/onboarding/__tests__/ProductTour.test.js** (8 tests)
   - Tour rendering
   - Step navigation
   - Tour completion
   - Skip and close actions

7. **components/__tests__/ReferralStats.test.js** (8 tests)
   - Referral count display
   - Invite statistics
   - Empty state handling
   - Data fetching and errors

8. **components/__tests__/CourseShareButton.test.js** (5 tests)
   - Button rendering
   - Modal opening/closing
   - Authentication checks
   - Accessibility

## Setup and Configuration

### Jest Configuration

File: `jest.config.js`
- Configured for Next.js 15 with React 19
- jsdom test environment
- Module aliasing for @/ imports
- CSS module mocking
- Coverage thresholds

### Jest Setup

File: `jest.setup.js`
- Testing Library setup
- localStorage mocking
- window.matchMedia mocking
- IntersectionObserver mocking
- Console error suppression

### Mock Files

- `__mocks__/supabase.js` - Supabase client mocking
- `__mocks__/next-navigation.js` - Next.js navigation mocking
- `__mocks__/styleMock.js` - CSS module mocking

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test -- courseValidation.test.js
```

### Generate Coverage Report

```bash
npm test -- --coverage
```

This generates a coverage report showing:
- **Statements**: % of code statements executed
- **Branches**: % of conditional branches tested
- **Functions**: % of functions tested
- **Lines**: % of lines executed

### Run Tests with Verbose Output

```bash
npm test -- --verbose
```

## Test Patterns Used

### 1. Utility Function Tests (Pure Functions)

```javascript
describe('formatCourseName', () => {
  it('should capitalize first letter of each word', () => {
    expect(formatCourseName('computer science')).toBe('Computer Science')
  })
})
```

### 2. Hook Tests

```javascript
const { result } = renderHook(() => useOnboarding())

act(() => {
  result.current.markTourCompleted()
})

expect(result.current.tourCompleted).toBe(true)
```

### 3. Component Tests

```javascript
render(<SmartCourseSelector value={null} onChange={mockOnChange} error={null} />)

await userEvent.type(input, 'test')
expect(screen.getByPlaceholderText('Search for your course...')).toBeInTheDocument()
```

### 4. Async Component Tests

```javascript
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

## Coverage Thresholds

Current coverage targets (configured in jest.config.js):
- **Statements**: 60%
- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%

To view which files need more coverage:

```bash
npm test -- --coverage
```

## Debugging Tests

### Run Single Test

```bash
npm test -- courseValidation.test.js -t "should capitalize first letter"
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open `chrome://inspect` in Chrome DevTools.

### Print Debug Info

```javascript
import { screen, debug } from '@testing-library/react'

// Inside test
debug() // Prints the entire DOM
screen.debug(screen.getByRole('button')) // Prints specific element
```

## Common Issues and Solutions

### Issue: "act" Warning

**Problem**: "Warning: An update to Component was not wrapped in act(...)"

**Solution**: Wrap state updates in `act()`:
```javascript
act(() => {
  result.current.updateState()
})
```

### Issue: localStorage Not Available

**Problem**: "localStorage is not defined"

**Solution**: Mocked in `jest.setup.js`, ensure it's imported

### Issue: Timeout in waitFor

**Problem**: "Timeout: waitFor timed out after 1000ms"

**Solution**:
- Increase timeout: `await waitFor(() => {...}, { timeout: 3000 })`
- Check async operations are properly awaited
- Verify mock data is set up correctly

### Issue: Modal Not Appearing

**Problem**: Modal component doesn't appear in rendered output

**Solution**:
- Use `waitFor` to wait for async rendering
- Check that mocks are set up correctly
- Verify component is actually rendering the modal

## Continuous Integration

For CI/CD pipelines, use:

```bash
# Run tests with coverage and exit
npm test -- --coverage --watchAll=false

# Check coverage thresholds
npm test -- --coverage --onlyChanged
```

## Adding New Tests

When adding new features:

1. **Create test file** in `__tests__` directory
2. **Follow naming convention**: `feature.test.js`
3. **Write tests for**:
   - Happy path (expected behavior)
   - Edge cases
   - Error conditions
   - Accessibility
4. **Maintain coverage** above 80% for new code
5. **Update this guide** if adding new patterns

## Test Best Practices

### 1. Test Behavior, Not Implementation

❌ Wrong:
```javascript
expect(component.state.isOpen).toBe(true)
```

✅ Right:
```javascript
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

### 2. Use Semantic Queries

✅ Good:
```javascript
screen.getByRole('button', { name: /Invite/i })
screen.getByPlaceholderText('Search...')
screen.getByLabelText('Course Name')
```

❌ Avoid:
```javascript
screen.getByTestId('btn-123')
container.querySelector('.course-selector')
```

### 3. Keep Tests Isolated

- Clear mocks between tests (`beforeEach`)
- Don't depend on test execution order
- Reset state after each test

### 4. Use Meaningful Assertions

```javascript
// Be specific about what you're testing
expect(result.current.tourCompleted).toBe(true)
expect(screen.getByText('Invite Classmates')).toBeInTheDocument()
expect(mockOnChange).toHaveBeenCalledWith(expectedValue)
```

## Performance Tips

### 1. Use `--onlyChanged`

Only run tests for changed files:
```bash
npm test -- --onlyChanged
```

### 2. Run Tests in Parallel

Jest runs tests in parallel by default. To reduce parallelization:
```bash
npm test -- --maxWorkers=2
```

### 3. Disable Unnecessary Features

```javascript
// In jest.setup.js
jest.useFakeTimers() // If not testing timers
```

## Security Testing

Ensure tests cover security aspects:

- ✅ Input validation (courseValidation tests)
- ✅ Access control (authentication checks)
- ✅ XSS prevention (user input sanitization)
- ✅ CSRF protection (not yet, would add)

## Monitoring Test Health

### Watch for:
- ⚠️ Flaky tests (inconsistent failures)
- ⚠️ Slow tests (> 5s)
- ⚠️ Skipped tests (marked with `it.skip`)
- ⚠️ Excessive mocking (sign of tight coupling)

### Tools:
```bash
# Find slow tests
npm test -- --detectOpenHandles

# Find flaky tests (run multiple times)
npm test -- --runInBand
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)

## Test Maintenance Checklist

- [ ] Tests pass locally before commit
- [ ] Coverage remains above thresholds
- [ ] No flaky tests in CI
- [ ] Mocks are up-to-date with API changes
- [ ] New code has corresponding tests
- [ ] Deprecated features tests updated/removed

---

**Last Updated**: November 3, 2024
**Test Count**: 93+
**Coverage Target**: 60%+
