/**
 * Product Tour Steps
 * Defines the interactive walkthrough for the upload flow
 */

export const uploadTourSteps = [
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">Welcome to JKUAT Course Hub! 👋</h2>
        <p className="text-gray-700">
          Let's walk you through uploading your first material. It only takes a minute!
        </p>
        <p className="text-sm text-gray-600">
          You can skip this tour anytime and revisit it from the help menu.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="course-select"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-gray-900">Step 1: Select Your Course</h3>
        <p className="text-gray-700">
          Start by selecting the course this material belongs to. Your course should be pre-selected!
        </p>
        <p className="text-sm text-gray-600">
          Tip: You can also create new courses if yours isn't listed.
        </p>
      </div>
    ),
    placement: 'bottom',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="unit-select"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-gray-900">Step 2: Choose the Unit</h3>
        <p className="text-gray-700">
          Select which unit/topic this material covers. You can also create new units on the fly!
        </p>
        <p className="text-sm text-gray-600">
          Units are organized by year and semester to keep everything structured.
        </p>
      </div>
    ),
    placement: 'bottom',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="category-select"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-gray-900">Step 3: Pick Material Type</h3>
        <p className="text-gray-700">
          What type of material are you uploading?
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
          <li>Notes - Lecture notes, study guides</li>
          <li>Past Papers - Previous exam questions</li>
          <li>Lab Materials - Lab manuals, practicals</li>
          <li>Assignments - Assignment questions</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="file-upload"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-gray-900">Step 4: Upload Your Files</h3>
        <p className="text-gray-700">
          Drag and drop files or click to browse. You can upload multiple files at once!
        </p>
        <p className="text-sm text-gray-600">
          Supported formats: PDF, DOCX, PPTX, images, and more.
        </p>
        <p className="text-sm font-medium text-blue-600 mt-2">
          Pro tip: You can even upload entire folders!
        </p>
      </div>
    ),
    placement: 'top',
    spotlightClicks: true,
  },
  {
    target: '[data-tour="submit-button"]',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-gray-900">Step 5: Submit!</h3>
        <p className="text-gray-700">
          Once you've added your files, click here to upload. Your materials will be reviewed before being published.
        </p>
        <p className="text-sm text-gray-600">
          Uploads happen in the background, so you can keep browsing!
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: 'body',
    content: (
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-gray-900">You're All Set! 🎉</h2>
        <p className="text-gray-700">
          That's it! You now know how to upload materials. The more you contribute, the more everyone benefits.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
          <p className="text-sm font-medium text-blue-900">
            Remember: You can invite classmates using the "Invite Classmates" button on any course page!
          </p>
        </div>
      </div>
    ),
    placement: 'center',
  },
];

// Styles for the tour
export const tourStyles = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: '#2563eb',
    textColor: '#1f2937',
    width: 380,
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  buttonNext: {
    backgroundColor: '#2563eb',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    padding: '10px 20px',
    fontWeight: '600',
  },
  buttonBack: {
    color: '#6b7280',
    fontSize: '14px',
    marginRight: '10px',
    padding: '10px 20px',
  },
  buttonSkip: {
    color: '#9ca3af',
    fontSize: '14px',
    padding: '10px',
  },
  buttonClose: {
    display: 'none', // Hide default close button
  },
};
