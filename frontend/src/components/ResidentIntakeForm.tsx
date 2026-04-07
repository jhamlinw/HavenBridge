import React, { useState } from 'react';
import { api } from '../services/api';
import type { Resident } from '../types/models';

export const ResidentIntakeForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Using Partial<Resident> since residentId and createdAt are handled by the backend
  const [formData, setFormData] = useState<Partial<Resident>>({
    safehouseId: 1, // Defaulting to 1; in a real app, this might come from the logged-in user's context
    caseControlNo: '',
    dateOfBirth: '',
    dateOfAdmission: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    caseCategory: 'Abandoned',
    initialRiskLevel: 'Medium',
    referralSource: '',
    assignedSocialWorker: '',
    caseStatus: 'Active',
    
    // Sub-category flags matching models.ts
    subCatOrphaned: false,
    subCatPhysicalAbuse: false,
    subCatSexualAbuse: false,
    subCatTrafficked: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Safely cast the target to an HTMLInputElement to access 'checked'
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;
    
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? checked : 
              name === 'safehouseId' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Calls the centralized API client you defined in api.ts
      await api.residents.create(formData);
      setSuccess(true);
      
      // Optional: Reset form after successful submission
      setFormData(prev => ({
        ...prev,
        caseControlNo: '',
        dateOfBirth: '',
        referralSource: '',
        assignedSocialWorker: '',
        subCatOrphaned: false,
        subCatPhysicalAbuse: false,
        subCatSexualAbuse: false,
        subCatTrafficked: false,
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to create resident case record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">New Resident Intake</h2>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">Resident intake saved successfully!</div>}

      {/* SECTION: Basic Information */}
      <fieldset className="mb-8">
        <legend className="text-lg font-semibold text-gray-700 mb-4">Core Information</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Case Control No.</label>
            <input required type="text" name="caseControlNo" value={formData.caseControlNo} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="e.g., C0073" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
            <input required type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date of Admission</label>
            <input required type="date" name="dateOfAdmission" value={formData.dateOfAdmission} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Assigned Social Worker</label>
            <input type="text" name="assignedSocialWorker" value={formData.assignedSocialWorker} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Classifications */}
      <fieldset className="mb-8">
        <legend className="text-lg font-semibold text-gray-700 mb-4 border-t pt-4">Case Assessment</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Case Category</label>
            <select name="caseCategory" value={formData.caseCategory} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
              <option value="Abandoned">Abandoned</option>
              <option value="Foundling">Foundling</option>
              <option value="Surrendered">Surrendered</option>
              <option value="Neglected">Neglected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Initial Risk Level</label>
            <select name="initialRiskLevel" value={formData.initialRiskLevel} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Referral Source</label>
            <select name="referralSource" value={formData.referralSource} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
              <option value="">Select...</option>
              <option value="Government Agency">Government Agency</option>
              <option value="NGO">NGO</option>
              <option value="Police">Police</option>
              <option value="Self-Referral">Self-Referral</option>
              <option value="Community">Community</option>
            </select>
          </div>
        </div>

        {/* Vulnerability Sub-Categories (Using fields defined in models.ts) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-md border">
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input type="checkbox" name="subCatOrphaned" checked={formData.subCatOrphaned} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>Orphaned</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input type="checkbox" name="subCatPhysicalAbuse" checked={formData.subCatPhysicalAbuse} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>Physical Abuse</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input type="checkbox" name="subCatSexualAbuse" checked={formData.subCatSexualAbuse} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>Sexual Abuse</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-700">
            <input type="checkbox" name="subCatTrafficked" checked={formData.subCatTrafficked} onChange={handleChange} className="rounded text-blue-600 focus:ring-blue-500" />
            <span>Trafficked</span>
          </label>
        </div>
      </fieldset>

      <div className="flex justify-end pt-4 border-t">
        <button 
          type="button" 
          className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Intake Record'}
        </button>
      </div>
    </form>
  );
};