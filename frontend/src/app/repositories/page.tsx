'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from '@/components/loading-spinner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Define interfaces for repository data
interface Repository {
  id: number;
  name: string;
  full_name: string;
  pr_count: number;
  review_count: number;
  stale_pr_count: number;
  contributor_count: number;
  last_activity: string;
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define mock data that will be used as fallback
  const mockRepositories: Repository[] = [
    {
      id: 1,
      name: 'api-service',
      full_name: 'organization/api-service',
      pr_count: 24,
      review_count: 48,
      stale_pr_count: 2,
      contributor_count: 5,
      last_activity: '2023-04-01T14:30:00Z'
    },
    {
      id: 2,
      name: 'frontend',
      full_name: 'organization/frontend',
      pr_count: 36,
      review_count: 72,
      stale_pr_count: 1,
      contributor_count: 8,
      last_activity: '2023-04-02T10:15:00Z'
    },
    {
      id: 3,
      name: 'core-lib',
      full_name: 'organization/core-lib',
      pr_count: 18,
      review_count: 32,
      stale_pr_count: 0,
      contributor_count: 3,
      last_activity: '2023-03-30T16:45:00Z'
    },
    {
      id: 4,
      name: 'docs',
      full_name: 'organization/docs',
      pr_count: 12,
      review_count: 20,
      stale_pr_count: 0,
      contributor_count: 6,
      last_activity: '2023-03-28T09:20:00Z'
    }
  ];

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setLoading(true);
        // Try to fetch real data from API
        try {
          const data = await api.getRepositories();
          if (data && data.length > 0) {
            setRepos(data);
          } else {
            // If API returns empty data, use mock data
            setRepos(mockRepositories);
          }
        } catch (apiError) {
          console.warn('Error fetching from API, using mock data', apiError);
          // On API error, use mock data
          setRepos(mockRepositories);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchRepositories:', err);
        setError('Failed to load repositories. Please try again later.');
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
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

  // Data for PR distribution chart
  const prData = repos.slice(0, 4).map(repo => ({
    name: repo.name,
    value: repo.pr_count
  }));

  const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Repositories</h1>
        <p className="text-gray-400">Monitor repository activity and pull request status</p>
      </div>

      {/* PR Distribution Chart */}
      <div className="bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Pull Request Distribution</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={prData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {prData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#e5e7eb' }} />
              <Legend formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Repositories Table */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-100">
              {repos.length} Repositories
            </h2>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Add Repository
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Repository
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Pull Requests
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Reviews
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Stale PRs
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contributors
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
              {repos.map((repo) => (
                <tr key={repo.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-300">{repo.full_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{repo.pr_count}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{repo.review_count}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm ${repo.stale_pr_count > 0 ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                      {repo.stale_pr_count}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{repo.contributor_count}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(repo.last_activity), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a 
                      href={`https://github.com/${repo.full_name}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-400 hover:text-indigo-300 mr-4"
                    >
                      View
                    </a>
                    <button className="text-indigo-400 hover:text-indigo-300">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}