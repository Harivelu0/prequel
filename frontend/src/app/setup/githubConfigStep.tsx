'use client';

import React from 'react';
import { 
  KeyIcon,
} from '@heroicons/react/24/outline';
import { StepHeader, ErrorMessage } from './setupCommonComponents';

interface GithubConfigStepProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  organizationToken: string;
  setOrganizationToken: (token: string) => void;
  enableSlackNotifications: boolean;
  setEnableSlackNotifications: (enabled: boolean) => void;
  handleGithubTokenSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

const GithubConfigStep: React.FC<GithubConfigStepProps> = ({ 
  currentStep,
  setCurrentStep,
  githubToken,
  setGithubToken,
  organizationToken,
  setOrganizationToken,
  enableSlackNotifications,
  setEnableSlackNotifications,
  handleGithubTokenSubmit,
  loading,
  error
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <StepHeader 
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          title="Configure GitHub Integration"
          subtitle="Enter your GitHub token and enable optional features."
        />
        
        <form onSubmit={handleGithubTokenSubmit} className="space-y-6">
          <div>
            <div className="flex items-center">
              <KeyIcon className="h-5 w-5 text-indigo-400 mr-2" />
              <label htmlFor="github-token" className="block text-lg font-medium text-gray-300">
                GitHub Personal Access Token
              </label>
            </div>
            <input
              id="github-token"
              type="password"
              className="mt-2 w-full px-4 py-3 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <p className="text-gray-400 text-sm mt-2">
              Paste the GitHub token you created in the previous step. Your token is stored securely and only used to access repository data.
            </p>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center">
              <KeyIcon className="h-5 w-5 text-indigo-400 mr-2" />
              <label htmlFor="org-name" className="block text-lg font-medium text-gray-300">
                Organization Name
              </label>
            </div>
            <input
              id="org-name"
              type="text"
              className="mt-2 w-full px-4 py-3 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your GitHub Organization Name"
              value={organizationToken}
              onChange={(e) => setOrganizationToken(e.target.value)}
            />
            <p className="text-gray-400 text-sm mt-2">
              Enter the GitHub organization name where you want to set up integrations.
            </p>
          </div>

          <div className="bg-gray-700/30 p-6 rounded-lg">
            <div className="flex items-start mb-4">
              <div className="flex items-center h-5">
                <input
                  id="slack-notifications"
                  type="checkbox"
                  className="h-5 w-5 text-indigo-600 bg-gray-700 border-gray-500 rounded focus:ring-indigo-500"
                  checked={enableSlackNotifications}
                  onChange={(e) => setEnableSlackNotifications(e.target.checked)}
                />
              </div>
              <label htmlFor="slack-notifications" className="ml-3 text-gray-300">
                Enable Slack Notifications
              </label>
            </div>
            <p className="text-gray-400 text-sm ml-8">
              Get notified in Slack when pull requests are created, reviewed, or become stale. 
            </p>
            {enableSlackNotifications && (
              <div className="ml-8 p-3 bg-gray-800 rounded-md">
                <p className="text-sm text-indigo-300 mb-2">
                  You'll need to create a Slack webhook in the next step.
                </p>
              </div>
            )}
          </div>

          <ErrorMessage error={error} />

          <div className="flex justify-between pt-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              onClick={() => setCurrentStep(1)}
            >
              Back
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Setting up...' : enableSlackNotifications ? 'Continue' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GithubConfigStep;