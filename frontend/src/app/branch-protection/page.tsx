'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/loading-spinner';

export default function BranchProtectionPage() {
  // For repository creation
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [repoVisibility, setRepoVisibility] = useState<'public' | 'private'>('public');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  
// Handle repository creation
const handleCreateRepo = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!repoName) {
    setCreateError('Repository name is required');
    return;
  }

  setCreateLoading(true);
  setCreateError(null);
  setCreateSuccess(false);

  try {
    const result = await api.createRepository({
      name: repoName,
      description: repoDescription,
      visibility: repoVisibility,
      branch: 'main',
    });
    
    if (result.success) {
      setCreateSuccess(true);
      if (!result.success) {
        setCreateError('Repository created, but there was an issue with branch protection.');
      }
      
      // Reset success message after a few seconds
      setTimeout(() => {
        setCreateSuccess(false);
      }, 5000);
      
      // Clear form
      setRepoName('');
      setRepoDescription('');
    } else {
      setCreateError('Failed to create repository. Please try again.');
    }
  } catch (err) {
    console.error('Error creating repository:', err);
    // Check if repository might have been created despite the error
    setCreateError('An error occurred, but the repository may have been created. Please check GitHub.');
  } finally {
    setCreateLoading(false);
  }
};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Repository Management</h1>
        <p className="text-gray-400">Create repositories and configure branch protection rules</p>
      </div>

      {/* Repository Creation Section */}
      <div className="bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Create New Repository With Branch Protection</h2>
        <form onSubmit={handleCreateRepo}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="repoName" className="block text-gray-300 mb-2">
                Repository Name <span className="text-red-400">*</span>
              </label>
              <input
                id="repoName"
                type="text"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="repository-name"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                required
              />
              <p className="text-gray-400 text-xs mt-1">
                Repository name only (e.g., frontend)
              </p>
            </div>

            <div>
              <label htmlFor="repoVisibility" className="block text-gray-300 mb-2">
                Visibility
              </label>
              <select
                id="repoVisibility"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={repoVisibility}
                onChange={(e) => setRepoVisibility(e.target.value as 'public' | 'private')}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="repoDescription" className="block text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="repoDescription"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Repository description"
              value={repoDescription}
              onChange={(e) => setRepoDescription(e.target.value)}
              rows={3}
            />
          </div>

          {createError && (
            <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-md">
              {createError}
            </div>
          )}

          {createSuccess && (
            <div className="mb-4 p-3 bg-green-900/50 text-green-300 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Repository {repoName} has been successfully created
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
              disabled={createLoading}
            >
              {createLoading ? <span><LoadingSpinner  /> Creating...</span> : 'Create Repository'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">About Branch Protection</h2>
        <p className="text-gray-300 mb-4">
          Branch protection rules help ensure quality by enforcing certain workflows on specific branches.
          This can prevent direct pushes to important branches and require code reviews before merging.
        </p>
        
        <div className="bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-md font-medium text-gray-100 mb-2">Benefits:</h3>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Prevent accidental force-pushes to protected branches</li>
            <li>Ensure code is reviewed before being merged</li>
            <li>Enforce status checks to pass before merging</li>
            <li>Maintain code quality through consistent review processes</li>
            <li>Automatically dismiss stale review approvals when code changes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}