'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  ArrowRightIcon 
} from '@heroicons/react/24/solid';
import { 
  CheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Creating a custom icons for simplicity
const PullRequestIcon = () => (
  <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 15C16.3431 15 15 16.3431 15 18C15 19.6569 16.3431 21 18 21C19.6569 21 21 19.6569 21 18C21 16.3431 19.6569 15 18 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 3C4.34315 3 3 4.34315 3 6C3 7.65685 4.34315 9 6 9C7.65685 9 9 7.65685 9 6C9 4.34315 7.65685 3 6 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 21C7.65685 21 9 19.6569 9 18C9 16.3431 7.65685 15 6 15C4.34315 15 3 16.3431 3 18C3 19.6569 4.34315 21 6 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9C19.6569 9 21 7.65685 21 6C21 4.34315 19.6569 3 18 3C16.3431 3 15 4.34315 15 6C15 7.65685 16.3431 9 18 9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserGroupIcon = () => (
  <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M6.34618 16.1429C5.79695 15.4468 4.94561 15 4 15C2.34315 15 1 16.3431 1 18V20H7M6.34618 16.1429C6.12028 16.7153 6 17.3357 6 18V20M6.34618 16.1429C6.85315 15.3744 7.61052 14.7524 8.5 14.416M16.6438 16.1429C15.7903 14.9083 14.5 14.1667 13.05 14.0344M8.5 14.416C9.31486 14.1127 10.2027 13.9496 11.1348 14.0003M8.5 14.416C8.5 12.3431 10.0147 10.5 12 10.5C13.9853 10.5 15.5 12.3431 15.5 14.416M11.1348 14.0003C11.7202 14.0334 12.2824 14.1329 12.8153 14.2923M11.1348 14.0003C9.98386 13.9324 9 13.0668 9 12C9 10.8954 9.89543 10 11 10M12.8153 14.2923C14.1476 14.6251 15.0662 15.4342 15.5 14.416M12.8153 14.2923C12.8153 14.2923 12.8153 14.2923 12.8153 14.2923M19 12C19 13.1046 18.1046 14 17 14C15.8954 14 15 13.1046 15 12C15 10.8954 15.8954 10 17 10C18.1046 10 19 10.8954 19 12ZM7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const BellIcon = () => (
  <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 17H9M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17C15 18.6569 13.6569 20 12 20C10.3431 20 9 18.6569 9 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function WelcomePage() {
  // We start at intro screen
  const [currentStep, setCurrentStep] = useState(0);
  
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 py-6 px-8 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Image 
              src="/team-analytics.svg" 
              alt="Prequel Logo" 
              width={40} 
              height={40} 
            />
            <h1 className="text-2xl font-bold text-white">Prequel</h1>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
              Track Your GitHub Pull Requests
            </h1>
            <p className="mt-6 text-xl text-gray-300">
              Get insights into your team's PR activity and stay on top of code reviews with timely notifications
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gray-800 rounded-xl p-8 shadow-lg hover:bg-gray-800/80 transition-colors">
              <div className="h-12 w-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <PullRequestIcon />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">PR Tracking & Analytics</h2>
              <p className="text-gray-300">
                Track all pull requests across your repositories. Monitor open PRs, reviews, and PR comments to gain insights into your team's code review process.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-8 shadow-lg hover:bg-gray-800/80 transition-colors">
              <div className="h-12 w-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <ClockIcon />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Stale PR Detection</h2>
              <p className="text-gray-300">
                Automatically detect and get notified about stale pull requests that need attention. Set a custom threshold for when PRs are considered stale.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-8 shadow-lg hover:bg-gray-800/80 transition-colors">
              <div className="h-12 w-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <UserGroupIcon />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Contributor Insights</h2>
              <p className="text-gray-300">
                Get metrics on your team's contribution patterns. See who's creating PRs, who's reviewing them, and identify collaboration patterns.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-8 shadow-lg hover:bg-gray-800/80 transition-colors">
              <div className="h-12 w-12 bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <BellIcon />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Slack Notifications</h2>
              <p className="text-gray-300">
                Receive real-time Slack alerts for important PR events: new pull requests, requested changes, and stale PRs that need your team's attention.
              </p>
            </div>
          </div>
          
          {/* Dashboard Preview */}
          <div className="mb-16 rounded-xl overflow-hidden shadow-2xl border border-gray-700">
            <Image 
              src="/dashboard-preview.png" 
              alt="Dashboard Preview" 
              width={1200} 
              height={675}
              className="w-full"
            />
          </div>
          
          {/* Setup Instructions */}
          <div className="bg-gray-800 rounded-xl p-10 shadow-lg max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Setup Guide</h2>
            
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                  1
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">Create a GitHub Token</h3>
                  <p className="mt-1 text-gray-300">
                    You'll need a GitHub personal access token (classic) with read permissions for your repositories, pull requests, and issues.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                  2
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">Set Up Slack Webhook (Optional)</h3>
                  <p className="mt-1 text-gray-300">
                    Create a Slack incoming webhook to receive notifications about pull request activities.
                  </p>
                </div>
              </div>
              
              <div className="flex">
                <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                  3
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-white">Configure Prequel</h3>
                  <p className="mt-1 text-gray-300">
                    Enter your GitHub token and optional Slack webhook URL to start tracking your PRs and receiving notifications.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center">
              <Link
                href="/setup"
                className="flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Begin Setup
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}