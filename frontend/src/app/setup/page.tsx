'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// Import modular components
import { SetupSuccess } from './setupCommonComponents';
import GithubTokenInstructions from './githubTokenSetup';
import GithubConfigStep from './githubConfigStep';
import SlackWebhookStep from './slackWebhookStep';

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [githubToken, setGithubToken] = useState('');
  const [enableSlackNotifications, setEnableSlackNotifications] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [stalePrDays, setStalePrDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [organizationToken, setOrganizationToken] = useState('');

  const handleGithubTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken) {
      setError('GitHub token is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate GitHub token
      await api.validateGithubToken(githubToken);
      
      // If Slack notifications are enabled, move to next step
      if (enableSlackNotifications) {
        setCurrentStep(3);
      } else {
        await completeSetup();
      }
    } catch (err) {
      console.error('Error validating GitHub token:', err);
      setError('Invalid GitHub token. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlackSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slackWebhookUrl) {
      setError('Slack Webhook URL is required for notifications');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completeSetup();
    } catch (err) {
      console.error('Error setting up Slack integration:', err);
      setError('Failed to set up Slack integration. Please check your webhook URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    try {
      // Save configuration using new endpoint
      await api.saveConfiguration({
        githubToken,
        organizationName: organizationToken,
        enableSlackNotifications,
        slackWebhookUrl: enableSlackNotifications ? slackWebhookUrl : '',
        stalePrDays: enableSlackNotifications ? stalePrDays : 7
      });
  
      // Mark onboarding as completed
      localStorage.setItem('onboardingCompleted', 'true');
      
      // Trigger redirect to dashboard
      window.dispatchEvent(new CustomEvent('setup-completed'));
      
      setSetupSuccess(true);
    } catch (err) {
      console.error('Error completing setup:', err);
      setError('Failed to save configuration. Please try again.');
    }
  }

  // Render success screen
  if (setupSuccess) {
    return <SetupSuccess />;
  }

  // Render current step
  switch (currentStep) {
    case 1:
      return <GithubTokenInstructions setCurrentStep={setCurrentStep} />;
    
    case 2:
      return (
        <GithubConfigStep
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          githubToken={githubToken}
          setGithubToken={setGithubToken}
          organizationToken={organizationToken}
          setOrganizationToken={setOrganizationToken}
          enableSlackNotifications={enableSlackNotifications}
          setEnableSlackNotifications={setEnableSlackNotifications}
          handleGithubTokenSubmit={handleGithubTokenSubmit}
          loading={loading}
          error={error}
        />
      );
    
    case 3:
      return (
        <SlackWebhookStep
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          slackWebhookUrl={slackWebhookUrl}
          setSlackWebhookUrl={setSlackWebhookUrl}
          stalePrDays={stalePrDays}
          setStalePrDays={setStalePrDays}
          handleSlackSetupSubmit={handleSlackSetupSubmit}
          loading={loading}
          error={error}
        />
      );
    
    default:
      return null;
  }
}