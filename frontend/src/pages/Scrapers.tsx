import React from 'react';

const Scrapers: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Scrapers
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your web scrapers
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Scrapers
            </h2>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Create New Scraper
            </button>
          </div>

          <div className="text-center py-12">
            <p className="text-gray-500">No scrapers created yet</p>
            <p className="text-sm text-gray-400 mt-2">Create your first scraper to get started</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scrapers;
