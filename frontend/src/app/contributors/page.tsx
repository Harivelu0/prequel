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
import Image from 'next/image'
// Define interface for contributor data
interface Contributor {
  id: number;
  github_id: number;
  username: string;
  avatar_url: string;
  pr_count: number;
  review_count: number;
  comment_count: number;
  command_count?: number;
  repositories: string[];
}

export default function ContributorsPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchContributors = async () => {
      try {
        setLoading(true);
        // Try to fetch from API
        try {
          console.log('Fetching contributors data...');
          
          // Make a direct fetch call to diagnose the issue
          // const directResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}`);
          // console.log('Direct fetch response status:', directResponse.status);
          
          // if (directResponse.ok) {
          //   const directData = await directResponse.json();
          //   console.log('Direct fetch data:', directData);
          // }
          
          // Now try with the API client
          const data = await api.getContributors();
          console.log('API client response:', data);
          
          if (data && Array.isArray(data) && data.length > 0) {
            // Process data - checking property names
            const processedData = data.map(item => {
              console.log('Processing contributor item:', item); // Add detailed logging
              
              // Create a typed contributor with robust fallbacks
              const typedContributor: Contributor = {
                id: item.id || 0,
                github_id: item.github_id || 0,
                username: item.username || 'Unknown',
                avatar_url: item.avatar_url || '',
                pr_count: item.pr_count || 0,
                review_count: item.review_count || 0,
                
                // Handle all possible comment/command property names with robust fallbacks
                comment_count: 
                  item.comment_count !== undefined ? item.comment_count : 
                  item.command_count !== undefined ? item.command_count : 0,
                
                repositories: Array.isArray(item.repositories) ? item.repositories : []
              };
              
              console.log('Processed contributor:', typedContributor); // Log the processed item
              return typedContributor;
            });
            
            setContributors(processedData);
          } else {
            console.error('No contributor data or invalid format:', data);
            setError('No contributors found or invalid data format.');
          }
        } catch (apiError) {
          console.error('Error fetching from API:', apiError);
          setError(`Failed to load contributors: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
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

  // Prepare chart data
  const chartData = contributors.map(contributor => ({
    name: contributor.username,
    'Pull Requests': contributor.pr_count,
    'Reviews': contributor.review_count,
    'Comments': contributor.comment_count // Use the standardized property name
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
              <Bar dataKey="Comments" fill="#f59e0b" /> {/* Changed from Commands to Comments */}
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
                  Comments
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
                      <Image
                        className="h-10 w-10 rounded-full"
                        src={contributor.avatar_url}
                        alt={contributor.username}
                        width={40}
                        height={40}
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
                    <div className="text-sm text-gray-300">{contributor.comment_count}</div>
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