import React from 'react';

const CreateScraper: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Scraper
          </h1>
          <p className="text-gray-600 mt-2">
            Set up a new web scraper with AI-powered selector generation
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Scraper Configuration
          </h2>
          <p className="text-gray-500">Scraper creation form will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default CreateScraper;
