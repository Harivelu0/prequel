'use client';

import { useState, useEffect } from 'react';
import { api, PRMetrics } from '@/lib/api';
import DashboardCard from '@/components/dashboard-card';
import StalePRsPage from '@/app/stale-prs/page';
import ContributorsBarChart from '@/components/contributors-bar-chart';
import ReviewersBarChart from '@/components/reviewers-bar-chart';
import LoadingSpinner from '@/components/loading-spinner';
import WelcomePage from '@/components/welcome-page';

export default function Home() {
  const [metrics, setMetrics] = useState<PRMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // In your page.tsx (dashboard) file, update your useEffect:
useEffect(() => {
  // Function to check status and load data
  const checkStatusAndLoad = () => {
    const demoModeActive = localStorage.getItem('demoMode') === 'true';
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted') === 'true';
    
    // Set state based on localStorage
    setIsDemoMode(demoModeActive);
    setOnboardingCompleted(demoModeActive || hasCompletedOnboarding);
    
    // If either condition is true, load dashboard data
    if (demoModeActive || hasCompletedOnboarding) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  };
  
  // Run the check
  checkStatusAndLoad();
  
  // Add event listener for storage changes
  const handleStorageChange = () => {
    checkStatusAndLoad();
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Clean up
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const metricsData = await api.getPRMetrics();
      setMetrics(metricsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const exitDemoMode = () => {
    // Remove demo mode flag
    localStorage.removeItem('demoMode');
    
    // Remove API URL setting
    localStorage.removeItem('apiUrl');
    
    // Remove onboarding completed flag to show welcome page
    localStorage.removeItem('onboardingCompleted');
    
    // Force page refresh to go back to welcome page
    window.location.href = '/';
  };

  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If onboarding is not completed and not in demo mode, show welcome page
  if (!onboardingCompleted && !isDemoMode) {
    return <WelcomePage />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400">Error</h2>
          <p className="mt-2 text-gray-300">{error}</p>
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
            
            {isDemoMode && (
              <button
                onClick={exitDemoMode}
                className="ml-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Exit Demo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Use metrics if available
  const dashboardMetrics: PRMetrics = metrics || {
    pr_authors: [],
    active_reviewers: [],
    comment_users: [],
    stale_pr_count: 0
  };

  // Rest of your dashboard code
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400">GitHub repository and workflow analytics</p>
        </div>
        
        {isDemoMode && (
          <div className="flex items-center">
            <span className="px-2 py-1 bg-red-800 text-white rounded-md text-xs mr-3">DEMO MODE</span>
            <button
              onClick={exitDemoMode}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Exit Demo
            </button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard
          title="Total Pull Requests"
          value={dashboardMetrics.pr_authors.reduce((acc, item) => acc + item[1], 0)}
          icon="pull-request"
        />
        <DashboardCard
          title="Active Reviewers"
          value={dashboardMetrics.active_reviewers.length}
          icon="user"
        />
        <DashboardCard
          title="Stale PRs"
          value={dashboardMetrics.stale_pr_count}
          icon="clock"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contributors Chart */}
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Top Contributors</h2>
          <ContributorsBarChart data={dashboardMetrics.pr_authors} />
        </div>

        {/* Reviewers Chart */}
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Top Reviewers</h2>
          <ReviewersBarChart data={dashboardMetrics.active_reviewers} />
        </div>
      </div>

      {/* Stale PRs widget */}
      <div className="bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Stale Pull Requests</h2>
          <StalePRsPage />
        </div>
      </div>
    </div>
  );
}