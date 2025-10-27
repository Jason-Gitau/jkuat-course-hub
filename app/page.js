import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="max-w-5xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            JKUAT Course Hub
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Student-driven platform for organizing course materials
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/upload"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Upload Material
            </Link>
            <Link
              href="/courses"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-colors"
            >
              Browse Courses
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Organized Materials</h3>
            <p className="text-gray-600">
              Course materials organized by week and topic for easy access during strikes and normal semesters.
            </p>
          </div>

          {/* AI Tutor - Hidden for now (feature coming later) */}
          {/* <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Tutor</h3>
            <p className="text-gray-600">
              Get instant answers to questions about your course materials, powered by AI and grounded in real content.
            </p>
          </div> */}

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Community-Driven</h3>
            <p className="text-gray-600">
              Students upload and share materials, helping everyone succeed together. Class reps lead the way!
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-600 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 mb-1">Upload Materials</h4>
                <p className="text-gray-600">
                  Class reps and students upload PDFs, notes, and course materials. Everything goes through approval before publishing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-600 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 mb-1">Admin Approval</h4>
                <p className="text-gray-600">
                  Materials are reviewed and approved to ensure quality and relevance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-blue-100 text-blue-600 font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 mb-1">Access & Learn</h4>
                <p className="text-gray-600">
                  Browse materials by course and topic for easy access to all your study materials.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8">
            Join your fellow students in building a better learning experience for everyone at JKUAT.
          </p>
          <Link
            href="/upload"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Upload Your First Material
          </Link>
        </div>
      </main>
    </div>
  );
}
