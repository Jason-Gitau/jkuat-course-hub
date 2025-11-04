/**
 * useOnboarding Hook
 * Manages onboarding and product tour state
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'jkuat_onboarding_state';

const defaultState = {
  tourCompleted: false,
  firstUploadCompleted: false,
  hasSeenWelcome: false,
  dismissedTour: false,
  lastStep: 0,
};

export function useOnboarding() {
  const [state, setState] = useState(defaultState);
  const [loading, setLoading] = useState(true);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ ...defaultState, ...parsed });
      }
    } catch (err) {
      console.error('Error loading onboarding state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (err) {
        console.error('Error saving onboarding state:', err);
      }
    }
  }, [state, loading]);

  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const markTourCompleted = () => {
    updateState({ tourCompleted: true, lastStep: 0 });
  };

  const markFirstUploadCompleted = () => {
    updateState({ firstUploadCompleted: true });
  };

  const markWelcomeSeen = () => {
    updateState({ hasSeenWelcome: true });
  };

  const dismissTour = () => {
    updateState({ dismissedTour: true });
  };

  const resetOnboarding = () => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const restartTour = () => {
    updateState({
      tourCompleted: false,
      dismissedTour: false,
      lastStep: 0
    });
  };

  const updateLastStep = (step) => {
    updateState({ lastStep: step });
  };

  const shouldShowTour = !state.tourCompleted && !state.dismissedTour;

  return {
    ...state,
    loading,
    shouldShowTour,
    markTourCompleted,
    markFirstUploadCompleted,
    markWelcomeSeen,
    dismissTour,
    resetOnboarding,
    restartTour,
    updateLastStep,
  };
}

/**
 * Check if user should see tour on a specific page
 */
export function shouldShowTourOnPage(pathname, onboardingState) {
  // Show on upload page if tour not completed
  if (pathname === '/upload' && onboardingState.shouldShowTour) {
    return true;
  }

  return false;
}
