'use client';

import { useCallback, useEffect, useState } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';
import { uploadTourSteps, tourStyles } from '@/lib/onboarding/tourSteps';
import { useOnboarding } from '@/lib/hooks/useOnboarding';

export default function ProductTour({ run = false, onComplete }) {
  const {
    shouldShowTour,
    markTourCompleted,
    dismissTour,
    updateLastStep,
    lastStep,
  } = useOnboarding();

  const [stepIndex, setStepIndex] = useState(lastStep || 0);
  const [shouldRun, setShouldRun] = useState(false);

  // Start tour when run prop is true and tour should be shown
  useEffect(() => {
    if (run && shouldShowTour) {
      setShouldRun(true);
    }
  }, [run, shouldShowTour]);

  const handleJoyrideCallback = useCallback((data) => {
    const { status, action, index, type } = data;

    // Update step index
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
      updateLastStep(index);
    }

    // Handle tour completion
    if (status === STATUS.FINISHED) {
      markTourCompleted();
      setShouldRun(false);
      onComplete?.();
    }

    // Handle tour skip
    if (status === STATUS.SKIPPED) {
      dismissTour();
      setShouldRun(false);
      onComplete?.();
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      dismissTour();
      setShouldRun(false);
      onComplete?.();
    }
  }, [markTourCompleted, dismissTour, updateLastStep, onComplete]);

  // Don't render if tour shouldn't be shown
  if (!shouldShowTour && !run) {
    return null;
  }

  return (
    <Joyride
      steps={uploadTourSteps}
      run={shouldRun}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollOffset={100}
      disableScrolling={false}
      callback={handleJoyrideCallback}
      styles={tourStyles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}
