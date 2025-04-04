'use client';

import React from 'react';
import { 
  ChatBubbleLeftRightIcon,
  CogIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { StepHeader, ErrorMessage } from './setupCommonComponents';

interface SlackWebhookStepProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  slackWebhookUrl: string;
  setSlackWebhookUrl: (url: string) => void;
  stalePrDays: number;
  setStalePrDays: (days: number) => void;
  handleSlackSetupSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

const SlackWebhookStep: React.FC<SlackWebhookStepProps> = ({ 
  currentStep,
  setCurrentStep,
  slackWebhookUrl,
  setSlackWebhookUrl,
  stalePrDays,
  setStalePrDays,
  handleSlackSetupSubmit,
  loading,
  error
}) => {
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
          Click the "Create an App" button at the top right of the page.
        </p>
      )
    },
    {
      number: 4,
      title: "Select 'From scratch'",
      content: (
        <p className="mt-1 text-gray-300">
          In the modal dialog, choose "From scratch" to start with a blank app.
        </p>
      )
    },
    {
      number: 5,
      title: "Name and select workspace",
      content: (
        <p className="mt-1 text-gray-300">
          Enter an app name (like "PR Notifications") and select your workspace from the dropdown menu.
        </p>
      )
    },
    {
      number: 6,
      title: "Configure Incoming Webhooks",
      content: (
        <p className="mt-1 text-gray-300">
          From the left sidebar menu, find and click on "Incoming Webhooks".
        </p>
      )
    },
    {
      number: 7,
      title: "Activate Webhooks",
      content: (
        <p className="mt-1 text-gray-300">
          Toggle the switch to "On" to activate incoming webhooks for your app.
        </p>
      )
    },
    {
      number: 8,
      title: "Add webhook to workspace",
      content: (
        <p className="mt-1 text-gray-300">
          Scroll down and click the "Add New Webhook to Workspace" button.
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
          Click "Allow", then copy the webhook URL that appears and paste it below.
        </p>
      )
    }
  ];

  const notificationTypes = [
    'New Pull Request Created',
    'Stale Pull Request Alerts (weekly check)'
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-3xl w-full">
        <StepHeader 
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          title="Setting Up Slack Integration"
          subtitle="Create a Slack webhook to receive PR notifications."
        />
        
        {/* Slack webhook instructions */}
        <div className="mb-8">
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
          
          <form onSubmit={handleSlackSetupSubmit} className="space-y-6">
            <div>
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-indigo-400 mr-2" />
                <label htmlFor="slack-webhook" className="block text-lg font-medium text-gray-300">
                  Slack Webhook URL
                </label>
              </div>
              <input
                id="slack-webhook"
                type="text"
                className="mt-2 w-full px-4 py-3 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
              />
              <p className="text-gray-400 text-sm mt-2">
                The webhook URL will look something like: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
              </p>
            </div>

            <div>
              <div className="flex items-center">
                <CogIcon className="h-5 w-5 text-indigo-400 mr-2" />
                <label htmlFor="stale-days" className="block text-lg font-medium text-gray-300">
                  Stale PR Threshold (Days)
                </label>
              </div>
              <div className="mt-2 max-w-xs">
                <input
                  id="stale-days"
                  type="number"
                  min="1"
                  max="30"
                  className="w-full px-4 py-3 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={stalePrDays}
                  onChange={(e) => setStalePrDays(parseInt(e.target.value) || 7)}
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Number of days of inactivity before a PR is considered stale.
              </p>
            </div>
            
            <div className="bg-gray-700/30 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-2">You'll receive notifications for:</h3>
              <ul className="space-y-2 text-gray-300">
                {notificationTypes.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <ErrorMessage error={error} />

            <div className="flex justify-between pt-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                onClick={() => setCurrentStep(2)}
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SlackWebhookStep;