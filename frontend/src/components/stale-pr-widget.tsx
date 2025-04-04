'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

// Define PullRequest interface
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

// Mock API client
const api = {
  getStalePRs: async (): Promise<PullRequest[]> => {
    // This would normally call your backend API
    // For now, return an empty array to be replaced with mock data later
    return Promise.resolve([]);
  }
};

export default function StalePRWidget() {
  const [stalePRs, setStalePRs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStalePRs = async () => {
      try {
        setLoading(true);
        const data = await api.getStalePRs();
        setStalePRs(data);
      } catch (error) {
        console.error('Error fetching stale PRs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStalePRs();
  }, []);

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
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  if (mockStalePRs.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        No stale pull requests found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Pull Request
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Repository
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Author
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Last Activity
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {mockStalePRs.map((pr) => (
            <tr key={pr.id} className="hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-300">
                      #{pr.number}
                    </div>
                    <div className="text-sm text-gray-400">
                      {pr.title}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-300">{pr.repository_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-300">{pr.author_name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-400">
                  {formatDistanceToNow(new Date(pr.last_activity_at), { addSuffix: true })}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <a href={pr.html_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">View</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}