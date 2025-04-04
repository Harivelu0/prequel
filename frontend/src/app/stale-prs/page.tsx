// src/app/stale-prs/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/loading-spinner';

// Define interfaces for our data models
interface Repository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  created_at: string;
}

interface User {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string;
  created_at: string;
}

interface PullRequest {
  id: number;
  github_id: number;
  repository_id: number;
  author_id: number;
  title: string;
  number: number;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  is_stale: boolean;
  last_activity_at: string;
  repository_name?: string;
  author_name?: string;
}

// Mock API client for demonstration
const api = {
  getStalePRs: async (): Promise<PullRequest[]> => {
    // In a real app, this would call your backend API
    // For demonstration, return mock data
    return Promise.resolve([]);
  }
};

export default function StalePRsPage() {
  const [stalePRs, setStalePRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStalePRs = async () => {
      try {
        setLoading(true);
        const data = await api.getStalePRs();
        setStalePRs(data);
      } catch (err) {
        console.error('Error fetching stale PRs:', err);
        setError('Failed to load stale pull requests. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStalePRs();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="mt-2 text-gray-600">{error}</p>
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

  // Mock data for demo purposes
  const mockStalePRs: PullRequest[] = stalePRs.length > 0 ? stalePRs : [
    {
      id: 1,
      github_id: 12345,
      repository_id: 1,
      author_id: 1,
      title: "Add new feature to dashboard",
      number: 42,
      state: "open",
      html_url: "https://github.com/org/repo/pull/42",
      created_at: "2023-03-15T10:00:00Z",
      updated_at: "2023-03-20T15:30:00Z",
      closed_at: null,
      merged_at: null,
      is_stale: true,
      last_activity_at: "2023-03-20T15:30:00Z",
      repository_name: "org/repo",
      author_name: "developer1"
    },
    {
      id: 2,
      github_id: 12346,
      repository_id: 1,
      author_id: 2,
      title: "Fix critical bug in authentication",
      number: 43,
      state: "open",
      html_url: "https://github.com/org/repo/pull/43",
      created_at: "2023-03-10T09:15:00Z",
      updated_at: "2023-03-12T14:20:00Z",
      closed_at: null,
      merged_at: null,
      is_stale: true,
      last_activity_at: "2023-03-12T14:20:00Z",
      repository_name: "org/repo",
      author_name: "developer2"
    },
    {
      id: 3,
      github_id: 12347,
      repository_id: 2,
      author_id: 3,
      title: "Implement new API endpoint for metrics",
      number: 21,
      state: "open",
      html_url: "https://github.com/org/another-repo/pull/21",
      created_at: "2023-02-28T11:45:00Z",
      updated_at: "2023-03-05T09:10:00Z",
      closed_at: null,
      merged_at: null,
      is_stale: true,
      last_activity_at: "2023-03-05T09:10:00Z",
      repository_name: "org/another-repo",
      author_name: "developer3"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Stale Pull Requests</h1>
        <p className="text-gray-600">Pull requests with no activity in the last 7 days</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">
              {mockStalePRs.length} Stale Pull Requests
            </h2>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Notify All
            </button>
          </div>
        </div>
        
        {mockStalePRs.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            No stale pull requests found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pull Request
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Repository
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockStalePRs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{pr.number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {pr.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{pr.repository_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{pr.author_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(pr.created_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(pr.last_activity_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a 
                        href={pr.html_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        View
                      </a>
                      <button className="text-indigo-600 hover:text-indigo-900">
                        Notify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}