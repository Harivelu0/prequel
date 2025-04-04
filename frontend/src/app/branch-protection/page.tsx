'use client';

import { useState } from 'react';
import { api, BranchProtectionRules } from '@/lib/api';
import LoadingSpinner from '@/components/loading-spinner';

export default function BranchProtectionPage() {
  // For repository creation
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [repoVisibility, setRepoVisibility] = useState<'public' | 'private'>('private');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  
  // For branch protection
  const [repository, setRepository] = useState('');
  const [branch, setBranch] = useState('main');
  const [requirePullRequest, setRequirePullRequest] = useState(true);
  const [requiredReviewers, setRequiredReviewers] = useState(1);
  const [dismissStaleReviews, setDismissStaleReviews] = useState(true);
  const [requireCodeOwners, setRequireCodeOwners] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  

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
        branch: 'main' // Default branch
      });
      
      if (result.success) {
        setCreateSuccess(true);
        // Reset success message after a few seconds
        setTimeout(() => {
          setCreateSuccess(false);
        }, 5000);
        
        // Clear form
        setRepoName('');
        setRepoDescription('');
        
        // Optionally, populate the branch protection form with the new repo
        if (result.repository) {
          setRepository(result.repository.name);
        }
      } else {
        setCreateError('Failed to create repository. Please try again.');
      }
    } catch (err) {
      console.error('Error creating repository:', err);
      setCreateError('Failed to create repository. Please check your permissions and try again.');
    } finally {
      setCreateLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!repository) {
      setError('Repository name is required');
      return;
    }
  
    setLoading(true);
    setError(null);
    setSuccess(false);
  
    try {
      // First create the repository
      const createResult = await api.createRepository({
        name: repository,
        branch
      });
      
      if (!createResult.success) {
        setError('Failed to create repository. Please try again.');
        setLoading(false);
        return;
      }
      
      // Now apply branch protection rules
      const rules: BranchProtectionRules = {
        requirePullRequest,
        requiredReviewers,
        dismissStaleReviews,
        requireCodeOwners
      };
      
      const result = await api.setupBranchProtection(repository, branch, rules);
      
      if (result.success) {
        setSuccess(true);
        
        // Reset success message after a few seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError('Failed to set up branch protection rules. Please try again.');
      }
    } catch (err) {
      console.error('Error setting up repository and branch protection:', err);
      setError('Failed to set up repository. Please check your permissions and try again.');
    } finally {
      setLoading(false);
    }
  };
  // Handle branch protection
  const handleProtectBranch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repository) {
      setError('Repository name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const rules: BranchProtectionRules = {
        requirePullRequest,
        requiredReviewers,
        dismissStaleReviews,
        requireCodeOwners
      };
      
      const result = await api.setupBranchProtection(repository, branch, rules);
      
      if (result.success) {
        setSuccess(true);
        // Reset success message after a few seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        setError('Failed to set up branch protection rules. Please try again.');
      }
    } catch (err) {
      console.error('Error setting up branch protection:', err);
      setError('Failed to set up branch protection. Please check repository access and try again.');
    } finally {
      setLoading(false);
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
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Create New Repository</h2>
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
                <option value="private">Private</option>
                <option value="public">Public</option>
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
              {createLoading ? <span><LoadingSpinner className="w-4 h-4 mr-2" /> Creating...</span> : 'Create Repository'}
            </button>
          </div>
        </form>
      </div>

      {/* Branch Protection Section */}
      <div className="bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Configure Branch Protection</h2>
        <form onSubmit={handleProtectBranch}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="repository" className="block text-gray-300 mb-2">
                Repository Name <span className="text-red-400">*</span>
              </label>
              <input
                id="repository"
                type="text"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="repository-name"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                required
              />
              <p className="text-gray-400 text-xs mt-1">
                Repository name only (e.g., frontend)
              </p>
            </div>

            <div>
              <label htmlFor="branch" className="block text-gray-300 mb-2">
                Branch Name <span className="text-red-400">*</span>
              </label>
              <input
                id="branch"
                type="text"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              />
              <p className="text-gray-400 text-xs mt-1">
                The branch you want to protect (e.g., main, master, development)
              </p>
            </div>
          </div>

          <div className="bg-gray-700/30 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-100 mb-4">Protection Rules</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="require-pr"
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-500 rounded focus:ring-indigo-500"
                  checked={requirePullRequest}
                  onChange={(e) => setRequirePullRequest(e.target.checked)}
                />
                <label htmlFor="require-pr" className="ml-2 text-gray-300">
                  Require pull request before merging
                </label>
              </div>
              
              {requirePullRequest && (
                <div className="ml-7">
                  <label htmlFor="required-reviewers" className="block text-gray-300 mb-2">
                    Required number of approving reviewers
                  </label>
                  <select
                    id="required-reviewers"
                    className="w-full max-w-xs px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={requiredReviewers}
                    onChange={(e) => setRequiredReviewers(Number(e.target.value))}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  id="dismiss-stale"
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-500 rounded focus:ring-indigo-500"
                  checked={dismissStaleReviews}
                  onChange={(e) => setDismissStaleReviews(e.target.checked)}
                />
                <label htmlFor="dismiss-stale" className="ml-2 text-gray-300">
                  Dismiss stale pull request approvals when new commits are pushed
                </label>
              </div>

              <div className="flex items-center">
                <input
                  id="require-codeowners"
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-500 rounded focus:ring-indigo-500"
                  checked={requireCodeOwners}
                  onChange={(e) => setRequireCodeOwners(e.target.checked)}
                />
                <label htmlFor="require-codeowners" className="ml-2 text-gray-300">
                  Require review from code owners
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/50 text-green-300 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Branch protection rules have been successfully applied to {repository}:{branch}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? <span><LoadingSpinner className="w-4 h-4 mr-2" /> Applying Rules...</span> : 'Apply Branch Protection Rules'}
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