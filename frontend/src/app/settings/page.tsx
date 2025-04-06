'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/loading-spinner';
import { 
  KeyIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Imported from your existing components
const GithubTokenInstructions = ({ onClose }: { onClose: () => void }) => {
  const steps = [
    {
      number: 1,
      title: "Go to GitHub Settings",
      content: (
        <p className="mt-1 text-gray-300">
          <a 
            href="https://github.com/settings/tokens" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            Click here to go directly to GitHub Token Settings
          </a>
        </p>
      )
    },
    {
      number: 2,
      title: "Access Developer Settings",
      content: (
        <p className="mt-1 text-gray-300">
          Scroll to the bottom of the sidebar and click on &quot;Developer settings&quot;.
        </p>
      )
    },
    {
      number: 3,
      title: "Generate a Personal Access Token",
      content: (
        <p className="mt-1 text-gray-300">
          Select &quot;Personal access tokens&quot; → &quot;Tokens (classic)&quot; → &quot;Generate new token&quot; → &quot;Generate new token (classic)&quot;.
        </p>
      )
    },
    {
      number: 4,
      title: "Set Token Permissions",
      content: (
        <>
          <p className="mt-1 text-gray-300">
            Select the following scopes:
          </p>
          <ul className="mt-2 space-y-1 text-gray-300 list-disc list-inside">
            <li><span className="font-medium">repo</span> - Full control of private repositories</li>
            <li><span className="font-medium">admin:org</span> - Full control of organizations and teams</li>
            <li><span className="font-medium">admin:hook</span> - Full control of repository hooks</li>
          </ul>
        </>
      )
    },
    {
      number: 5,
      title: "Generate and Copy Token",
      content: (
        <p className="mt-1 text-gray-300">
          Click &quot;Generate token&quot; at the bottom of the page. <span className="text-red-300 font-medium">Make sure to copy your new token immediately</span> - you won&apos;t be able to see it again!
        </p>
      )
    }
  ];

  return (
    <div className="p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Creating a GitHub Personal Access Token</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      
      <p className="text-gray-300 mb-6">Follow these steps to generate a token with the required permissions.</p>
      
      {/* Step-by-step instructions */}
      <div className="space-y-6 mb-8">
        {steps.map((step) => (
          <div className="flex" key={step.number}>
            <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-300">
              {step.number}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-white">{step.title}</h3>
              {step.content}
            </div>
          </div>
        ))}

        <div className="flex">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-6 w-6 text-blue-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-blue-300">
              Remember that personal access tokens are like passwords. Never share them publicly and consider setting an expiration date for added security.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <button
          type="button"
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={onClose}
        >
          Close Instructions
        </button>
      </div>
    </div>
  );
};

const SlackWebhookInstructions = ({ onClose }: { onClose: () => void }) => {
  const slackInstructions = [
    {
      number: 1,
      title: "Sign in to your Slack account",
      content: (
        <p className="mt-1 text-gray-300">
          Log in to your Slack workspace where you want to receive notifications.
        </p>
      )
    },
    {
      number: 2,
      title: "Go to Slack Apps page",
      content: (
        <p className="mt-1 text-gray-300">
          <a 
            href="https://api.slack.com/apps/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:text-indigo-300 underline"
          >
            Visit the Slack API Apps page
          </a>
        </p>
      )
    },
    {
      number: 3,
      title: "Create an App",
      content: (
        <p className="mt-1 text-gray-300">
          Click the &quot;Create an App&quot; button at the top right of the page.
        </p>
      )
    },
    {
      number: 4,
      title: "Select 'From scratch'",
      content: (
        <p className="mt-1 text-gray-300">
          In the modal dialog, choose &quot;From scratch&quot; to start with a blank app.
        </p>
      )
    },
    {
      number: 5,
      title: "Name and select workspace",
      content: (
        <p className="mt-1 text-gray-300">
          Enter an app name (like &quot;PR Notifications&quot;) and select your workspace from the dropdown menu.
        </p>
      )
    },
    {
      number: 6,
      title: "Configure Incoming Webhooks",
      content: (
        <p className="mt-1 text-gray-300">
          From the left sidebar menu, find and click on &quot;Incoming Webhooks&quot;.
        </p>
      )
    },
    {
      number: 7,
      title: "Activate Webhooks",
      content: (
        <p className="mt-1 text-gray-300">
          Toggle the switch to &quot;On&quot; to activate incoming webhooks for your app.
        </p>
      )
    },
    {
      number: 8,
      title: "Add webhook to workspace",
      content: (
        <p className="mt-1 text-gray-300">
          Scroll down and click the &quot;Add New Webhook to Workspace&quot; button.
        </p>
      )
    },
    {
      number: 9,
      title: "Select channel",
      content: (
        <p className="mt-1 text-gray-300">
          Choose which channel should receive the PR notifications from the dropdown menu.
        </p>
      )
    },
    {
      number: 10,
      title: "Allow and copy webhook URL",
      content: (
        <p className="mt-1 text-gray-300">
          Click &quot;Allow&quot;, then copy the webhook URL that appears and paste it below.
        </p>
      )
    }
  ];

  return (
    <div className="p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Setting Up Slack Integration</h2>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      
      <p className="text-gray-300 mb-6">Create a Slack webhook to receive PR notifications.</p>
      
      {/* Slack webhook instructions */}
      <div className="bg-gray-700/30 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-white mb-4">How to Create a Slack Webhook</h3>
        
        <div className="space-y-6">
          {slackInstructions.map((step) => (
            <div className="flex" key={step.number}>
              <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-gray-300">
                {step.number}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-white">{step.title}</h3>
                {step.content}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end mt-6">
        <button
          type="button"
          className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onClick={onClose}
        >
          Close Instructions
        </button>
      </div>
    </div>
  );
};

// Modal component
const Modal = ({ isOpen, onClose, children }: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode 
}) => {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75"
      onClick={onClose} // Add this to close when clicking the backdrop
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
      >
        {children}
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const [githubToken, setGithubToken] = useState('');
  const [enableSlackNotifications, setEnableSlackNotifications] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [stalePrDays, setStalePrDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  
  // State for modals
  const [showGithubInstructions, setShowGithubInstructions] = useState(false);
  const [showSlackInstructions, setShowSlackInstructions] = useState(false);
  
  // Fetch existing settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Fetch current settings from the API
        const settings = await api.getConfiguration();
        
        // Populate form
        setGithubToken('••••••••••••••••••••');  // Don't show actual token for security
        setOrganizationName(settings.organizationName ? '••••••••••••••••••••' : '');
        setEnableSlackNotifications(settings.enableSlackNotifications);
        setSlackWebhookUrl(settings.slackWebhookUrl? '••••••••••••••••••••' : '');
        setStalePrDays(settings.stalePrDays || 7);
        
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchSettings();
  }, []);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setSaving(true);
    setError(null);
    setSuccess(false);
  
    try {
      // Only update if there's a new token (not the placeholder)
      const tokenToSave = githubToken === '••••••••••••••••••••' ? null : githubToken;
      const orgNameToSave = organizationName === '' ? null : organizationName;
      
      // Only update if there's a new webhook (not the placeholder)
      const webhookToSave = slackWebhookUrl === '••••••••••••••••••••' ? null : slackWebhookUrl;
      
      await api.saveConfiguration({
        githubToken: tokenToSave ?? undefined,
        organizationName: orgNameToSave ?? undefined, 
        enableSlackNotifications,
        slackWebhookUrl: webhookToSave ?? undefined,
        stalePrDays
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your connections and notification preferences</p>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* GitHub Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-indigo-400" />
              GitHub Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="github-token" className="block text-gray-300 mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  id="github-token"
                  type="password"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter new token to update"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-gray-400 text-xs">
                    Leave as is if you don&apos;t want to change your token.
                  </p>
                  <button
                    type="button"
                    className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
                    onClick={() => setShowGithubInstructions(true)}
                  >
                    <InformationCircleIcon className="h-4 w-4 mr-1" />
                    How to create a GitHub token
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Slack Integration Section */}
          <div className="pt-4 border-t border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-indigo-400" />
              Slack Integration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-700 border-gray-500 rounded focus:ring-indigo-500"
                    checked={enableSlackNotifications}
                    onChange={(e) => setEnableSlackNotifications(e.target.checked)}
                  />
                  <span className="ml-2 text-gray-300">
                    Enable Slack Notifications
                  </span>
                </label>
                <p className="text-gray-400 text-xs mt-1 ml-7">
                  Get notified in Slack when PRs are created, reviewed, or need attention
                </p>
              </div>

              {enableSlackNotifications && (
                <div className="space-y-4 mt-4 ml-7">
                  <div>
                    <label htmlFor="slack-webhook" className="block text-gray-300 mb-2">
                      Slack Webhook URL
                    </label>
                    <input
                      id="slack-webhook"
                      type="password"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter new webhook URL to update"
                      value={slackWebhookUrl}
                      onChange={(e) => setSlackWebhookUrl(e.target.value)}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-gray-400 text-xs">
                        Leave as is if you don&apos;t want to change your webhook URL.
                      </p>
                      <button
                        type="button"
                        className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center"
                        onClick={() => setShowSlackInstructions(true)}
                      >
                        <InformationCircleIcon className="h-4 w-4 mr-1" />
                        How to create a Slack webhook
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="stale-days" className="block text-gray-300 mb-2">
                      Stale PR Threshold (Default 7 days) 
                    </label>
                  </div>

                  <div className="bg-gray-700/30 p-4 rounded-md">
                    <h3 className="text-sm font-medium text-white mb-2">Notification Types</h3>
                    <ul className="space-y-1 text-gray-300 text-sm">
                      <li className="flex items-start">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        New pull request created
                      </li>
                      <li className="flex items-start">
                        <CheckIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        Stale pull request alerts (Weekly check)
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 text-red-300 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-900/50 text-green-300 rounded-md flex items-center">
              <CheckIcon className="h-5 w-5 mr-2" />
              Settings saved successfully!
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Instruction Modals */}
      <Modal isOpen={showGithubInstructions} onClose={() => setShowGithubInstructions(false)}>
        <GithubTokenInstructions onClose={() => setShowGithubInstructions(false)} />
      </Modal>
      
      <Modal isOpen={showSlackInstructions} onClose={() => setShowSlackInstructions(false)}>
        <SlackWebhookInstructions onClose={() => setShowSlackInstructions(false)} />
      </Modal>
    </div>
  );
}