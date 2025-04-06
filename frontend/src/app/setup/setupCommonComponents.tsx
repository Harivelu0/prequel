'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';

// Reusable Progress Indicator Component
export const ProgressIndicator: React.FC<{ currentStep: number; totalSteps?: number }> = ({ 
  currentStep, 
  totalSteps = 3 
}) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          {index > 0 && (
            <div className={`h-1 w-8 ${step <= currentStep ? 'bg-indigo-600' : 'bg-gray-700'}`}></div>
          )}
          <div
            className={`flex items-center justify-center h-8 w-8 rounded-full ${
              step < currentStep
                ? 'bg-indigo-600 text-white opacity-50'
                : step === currentStep
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-400'
            }`}
          >
            {step < currentStep ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <span className="font-medium">{step}</span>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// Reusable Step Header Component
interface StepHeaderProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  title: string;
  subtitle: string;
}

export const StepHeader: React.FC<StepHeaderProps> = ({ 
  currentStep, 
  setCurrentStep, 
  title, 
  subtitle 
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="text-gray-400 hover:text-white flex items-center"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back
        </button>
        <ProgressIndicator currentStep={currentStep} />
      </div>
      <h1 className="text-2xl font-bold text-white mt-4">{title}</h1>
      <p className="text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
};

// Error Message Component
export const ErrorMessage: React.FC<{ error: string | null }> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="p-4 bg-red-900/50 text-red-300 rounded-md">
      {error}
    </div>
  );
};

// Setup Success Component with Automatic Redirect
export const SetupSuccess = () => {
  const router = useRouter();

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      // Replace the current history entry with home page
      router.replace('/');
    }, 3000); // Redirect after 3 seconds

    // Cleanup the timer if the component unmounts
    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <div className="mb-4 text-green-400 flex justify-center">
          <CheckIcon className="h-16 w-16" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Setup Complete!</h1>
        <p className="text-gray-300 mb-4">Your dashboard is being prepared. Redirecting to home page...</p>
      </div>
    </div>
  );
};

