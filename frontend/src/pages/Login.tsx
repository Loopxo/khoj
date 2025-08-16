import React from 'react';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img 
              src="/khoj-logo.png" 
              alt="Khoj Advanced Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Khoj Advanced
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI-Powered Web Scraping Platform
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Login form will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
