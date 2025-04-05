'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/loading-spinner';
import { 
  KeyIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    setError(null);
    setSuccess(false);
  
    try {
      // Only update if there's a new token (not the placeholder)
      const tokenToSave = githubToken === '••••••••••••••••••••' ? null : githubToken;
      const orgNameToSave = organizationName === ''? null : organizationName;
      
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
                <p className="text-gray-400 text-xs mt-1">
                  Leave as is if you don't want to change your token.
                </p>
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
                    <p className="text-gray-400 text-xs mt-1">
                      Leave as is if you don't want to change your webhook URL.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="stale-days" className="block text-gray-300 mb-2">
                      Stale PR Threshold (Default 7 Days)
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
                        Stale pull request alerts (daily check)
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <a 
                      href="https://api.slack.com/messaging/webhooks" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 text-sm"
                    >
                      Need help setting up a Slack webhook?
                    </a>
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
      
      {/* Help Section */}
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">How to Update Your Configuration</h2>
        
        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="font-medium text-white">GitHub Token</h3>
            <p className="mt-1">
              If you need to generate a new GitHub token, follow the same steps as during setup. Enter your new token here to update.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-white">Slack Webhook</h3>
            <p className="mt-1">
              To create a new Slack webhook or update an existing one, go to your Slack workspace's App management page.
              You can create a new webhook or update an existing one for a different channel.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-white">Need Help?</h3>
            <p className="mt-1">
              Contact your administrator or check our documentation for more information on configuring Prequel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}