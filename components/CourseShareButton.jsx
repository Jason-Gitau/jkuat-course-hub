'use client';

import { useState } from 'react';
import { useUser } from '@/lib/providers/UserProvider';
import InviteClassmatesModal from '@/components/onboarding/InviteClassmatesModal';

export default function CourseShareButton({ course }) {
  const { user, profile } = useUser();
  const [showModal, setShowModal] = useState(false);

  // Only show for authenticated users
  if (!user || !profile) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
        title="Invite classmates to this course"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Invite Classmates
      </button>

      {showModal && (
        <InviteClassmatesModal
          course={course}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
