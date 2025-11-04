import { renderHook, act } from '@testing-library/react'
import { useOnboarding } from '../useOnboarding'

describe('useOnboarding', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    localStorage.getItem.mockClear()
    localStorage.setItem.mockClear()
    localStorage.removeItem.mockClear()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOnboarding())

    expect(result.current.tourCompleted).toBe(false)
    expect(result.current.firstUploadCompleted).toBe(false)
    expect(result.current.hasSeenWelcome).toBe(false)
    expect(result.current.dismissedTour).toBe(false)
  })

  it('should load state from localStorage on mount', () => {
    const savedState = {
      tourCompleted: true,
      firstUploadCompleted: true,
      hasSeenWelcome: true,
      dismissedTour: false,
      lastStep: 3,
    }

    localStorage.getItem.mockReturnValue(JSON.stringify(savedState))

    const { result } = renderHook(() => useOnboarding())

    expect(result.current.tourCompleted).toBe(true)
    expect(result.current.firstUploadCompleted).toBe(true)
    expect(result.current.lastStep).toBe(3)
  })

  it('should save state to localStorage on update', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.markTourCompleted()
    })

    expect(localStorage.setItem).toHaveBeenCalled()
    const [key, value] = localStorage.setItem.mock.calls[0]
    expect(key).toBe('jkuat_onboarding_state')
    const savedState = JSON.parse(value)
    expect(savedState.tourCompleted).toBe(true)
  })

  it('should mark tour as completed', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.markTourCompleted()
    })

    expect(result.current.tourCompleted).toBe(true)
    expect(result.current.lastStep).toBe(0)
  })

  it('should mark first upload as completed', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.markFirstUploadCompleted()
    })

    expect(result.current.firstUploadCompleted).toBe(true)
  })

  it('should mark welcome as seen', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.markWelcomeSeen()
    })

    expect(result.current.hasSeenWelcome).toBe(true)
  })

  it('should dismiss tour', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.dismissTour()
    })

    expect(result.current.dismissedTour).toBe(true)
  })

  it('should compute shouldShowTour correctly', () => {
    const { result } = renderHook(() => useOnboarding())

    // Initially should show tour
    expect(result.current.shouldShowTour).toBe(true)

    // After completion, should not show
    act(() => {
      result.current.markTourCompleted()
    })

    expect(result.current.shouldShowTour).toBe(false)
  })

  it('should not show tour if dismissed', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.dismissTour()
    })

    expect(result.current.shouldShowTour).toBe(false)
  })

  it('should reset onboarding state', () => {
    const { result } = renderHook(() => useOnboarding())

    // Set some state
    act(() => {
      result.current.markTourCompleted()
      result.current.markFirstUploadCompleted()
    })

    // Reset
    act(() => {
      result.current.resetOnboarding()
    })

    // State should be back to defaults
    expect(result.current.tourCompleted).toBe(false)
    expect(result.current.firstUploadCompleted).toBe(false)
    expect(localStorage.removeItem).toHaveBeenCalledWith('jkuat_onboarding_state')
  })

  it('should restart tour', () => {
    const { result } = renderHook(() => useOnboarding())

    // Complete tour
    act(() => {
      result.current.markTourCompleted()
    })

    expect(result.current.tourCompleted).toBe(true)

    // Restart tour
    act(() => {
      result.current.restartTour()
    })

    expect(result.current.tourCompleted).toBe(false)
    expect(result.current.dismissedTour).toBe(false)
    expect(result.current.shouldShowTour).toBe(true)
  })

  it('should update last step', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.updateLastStep(5)
    })

    expect(result.current.lastStep).toBe(5)
  })

  it('should handle multiple updates', () => {
    const { result } = renderHook(() => useOnboarding())

    act(() => {
      result.current.markWelcomeSeen()
      result.current.updateLastStep(2)
      result.current.markFirstUploadCompleted()
    })

    expect(result.current.hasSeenWelcome).toBe(true)
    expect(result.current.lastStep).toBe(2)
    expect(result.current.firstUploadCompleted).toBe(true)
  })

  it('should handle corrupted localStorage data', () => {
    localStorage.getItem.mockReturnValue('invalid json {]')

    const { result } = renderHook(() => useOnboarding())

    // Should fall back to defaults
    expect(result.current.tourCompleted).toBe(false)
  })

  it('should handle missing localStorage', () => {
    localStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useOnboarding())

    // Should use defaults
    expect(result.current.tourCompleted).toBe(false)
    expect(result.current.loading).toBe(false)
  })
})
