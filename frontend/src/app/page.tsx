'use client';

import { useState, useEffect } from 'react';
import { api, PRMetrics } from '@/lib/api';
import DashboardCard from '@/components/dashboard-card';
import StalePRWidget from '@/components/stale-pr-widget';
import ContributorsBarChart from '@/components/contributors-bar-chart';
import ReviewersBarChart from '@/components/reviewers-bar-chart';
import LoadingSpinner from '@/components/loading-spinner';
import WelcomePage from '@/components/welcome-page';

export default function Home() {
  const [metrics, setMetrics] = useState<PRMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  
  useEffect(() => {
    // Check if the user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted') === 'true';
    setOnboardingCompleted(hasCompletedOnboarding);
    
    // If onboarding is complete, fetch dashboard data
    if (hasCompletedOnboarding) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
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

  if (loading) {
    return <LoadingSpinner />;
  }
  
  // If onboarding is not completed, show welcome page
  if (!onboardingCompleted) {
    return <WelcomePage />;
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400">Error</h2>
          <p className="mt-2 text-gray-300">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Use metrics if available, otherwise use mock data
  const dashboardMetrics: PRMetrics = metrics || {
    pr_authors: [['user1', 12], ['user2', 8], ['user3', 6], ['user4', 5], ['user5', 4]],
    active_reviewers: [['reviewer1', 15], ['reviewer2', 12], ['reviewer3', 9], ['reviewer4', 7], ['reviewer5', 5]],
    comment_users: [['user2', 8], ['user1', 6], ['user4', 4]],
    stale_pr_count: 3
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-gray-400">GitHub repository and workflow analytics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard
          title="Total Pull Requests"
          value={dashboardMetrics.pr_authors.reduce((acc, [_, count]) => acc + count, 0)}
          icon="pull-request"
          trend={+5}
        />
        <DashboardCard
          title="Active Reviewers"
          value={dashboardMetrics.active_reviewers.length}
          icon="user"
          trend={+2}
        />
        <DashboardCard
          title="Stale PRs"
          value={dashboardMetrics.stale_pr_count}
          icon="clock"
          trend={-1}
          trendDirection="down"
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
          <StalePRWidget />
        </div>
      </div>
    </div>
  );
}