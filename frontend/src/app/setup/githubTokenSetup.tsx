'use client';

import React from 'react';
import { 
  ChevronRightIcon,
} from '@heroicons/react/24/solid';
import { 
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { StepHeader } from './setupCommonComponents';

const GithubTokenInstructions = ({ setCurrentStep }: { setCurrentStep: (step: number) => void }) => {
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
          Scroll to the bottom of the sidebar and click on "Developer settings".
        </p>
      )
    },
    {
      number: 3,
      title: "Generate a Personal Access Token",
      content: (
        <p className="mt-1 text-gray-300">
          Select "Personal access tokens" → "Tokens (classic)" → "Generate new token" → "Generate new token (classic)".
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
          Click "Generate token" at the bottom of the page. <span className="text-red-300 font-medium">Make sure to copy your new token immediately</span> - you won't be able to see it again!
        </p>
      )
    }
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-3xl w-full">
        <StepHeader 
          currentStep={1}
          setCurrentStep={setCurrentStep}
          title="Creating a GitHub Personal Access Token"
          subtitle="Follow these steps to generate a token with the required permissions."
        />
        
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
        
        <div className="flex justify-end">
          <button
            type="button"
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => setCurrentStep(2)}
          >
            Continue to Setup
            <ChevronRightIcon className="ml-2 h-4 w-4 inline" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GithubTokenInstructions;