// frontend/src/pages/ResidentIntakePage.tsx
import React from 'react';
import { ResidentIntakeForm } from '../components/ResidentIntakeForm';
import { Link } from 'react-router-dom';

export const ResidentIntakePage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb / Header area */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Resident Intake</h1>
          <p className="text-sm text-gray-600 mt-1">
            Register a new resident into the HavenBridge case management system.
          </p>
        </div>
        <Link 
          to="/cases" 
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          &larr; Back to Cases
        </Link>
      </div>

      {/* Render your newly created form */}
      <ResidentIntakeForm />
    </div>
  );
};