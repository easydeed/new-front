'use client';

export default function TailwindTest() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-primary mb-4">Tailwind CSS Test</h1>
        <p className="text-gray-600 mb-6">
          This page uses Tailwind CSS classes to verify the integration is working correctly.
        </p>
        <div className="space-y-4">
          <button className="w-full bg-accent text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
            Primary Button
          </button>
          <button className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Secondary Button
          </button>
        </div>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">
            ✅ If you can see this styled card with buttons, Tailwind CSS is working!
          </p>
        </div>
      </div>
    </div>
  );
} 