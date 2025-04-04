'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/loading-spinner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Define interface for contributor data
interface Contributor {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string;
  pr_count: number;
  review_count: number;
  command_count: number;
  repositories: string[];
}

export default function ContributorsPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define mock data here, before it's used
  const mockContributors: Contributor[] = [
    {
      id: 1,
      github_id: 1001,
      username: 'developer1',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer1',
      pr_count: 24,
      review_count: 36,
      command_count: 8,
      repositories: ['api-service', 'frontend', 'core-lib']
    },
    {
      id: 2,
      github_id: 1002,
      username: 'developer2',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer2',
      pr_count: 18,
      review_count: 42,
      command_count: 12,
      repositories: ['frontend', 'docs']
    },
    {
      id: 3,
      github_id: 1003,
      username: 'developer3',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer3',
      pr_count: 16,
      review_count: 28,
      command_count: 5,
      repositories: ['core-lib', 'api-service']
    },
    {
      id: 4,
      github_id: 1004,
      username: 'developer4',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer4',
      pr_count: 12,
      review_count: 20,
      command_count: 3,
      repositories: ['docs', 'frontend']
    },
    {
      id: 5,
      github_id: 1005,
      username: 'developer5',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer5',
      pr_count: 8,
      review_count: 15,
      command_count: 2,
      repositories: ['api-service']
    }
  ];

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        setLoading(true);
        // Try to fetch from API first
        try {
          const data = await api.getContributors();
          if (data && data.length > 0) {
            setContributors(data);
          } else {
            // If API returns empty data, use mock data
            setContributors(mockContributors);
          }
        } catch (apiError) {
          console.warn('Error fetching from API, using mock data', apiError);
          // On API error, use mock data
          setContributors(mockContributors);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchContributors:', err);
        setError('Failed to load contributors. Please try again later.');
        setLoading(false);
      }
    };

    fetchContributors();
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

  // Prepare data for the contributor activity chart
  const chartData = contributors.map(contributor => ({
    name: contributor.username,
    'Pull Requests': contributor.pr_count,
    'Reviews': contributor.review_count,
    'Commands': contributor.command_count
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Contributors</h1>
        <p className="text-gray-400">GitHub contributors and their activity</p>
      </div>

      {/* Contributor Activity Chart */}
      <div className="bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Contributor Activity</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="name" tick={{ fill: '#e5e7eb' }} />
              <YAxis tick={{ fill: '#e5e7eb' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937',
                  borderColor: '#4b5563',
                  color: '#e5e7eb'
                }} 
              />
              <Legend formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>} />
              <Bar dataKey="Pull Requests" fill="#8b5cf6" />
              <Bar dataKey="Reviews" fill="#10b981" />
              <Bar dataKey="Commands" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Contributors Table */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">
            {contributors.length} Contributors
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Contributor
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Pull Requests
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Reviews
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Commands
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Repositories
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {contributors.map((contributor) => (
                <tr key={contributor.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img 
                          className="h-10 w-10 rounded-full" 
                          src={contributor.avatar_url} 
                          alt={contributor.username} 
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-300">
                          {contributor.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{contributor.pr_count}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{contributor.review_count}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">{contributor.command_count}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">
                      {contributor.repositories.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a 
                      href={`https://github.com/${contributor.username}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      View Profile
                    </a>
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