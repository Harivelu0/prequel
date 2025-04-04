'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CommentsBarChartProps {
  data: [string, number][];
}

export default function CommentsBarChart({ data }: CommentsBarChartProps) {
  // Transform data for Recharts
  const chartData = data.map(([name, count]) => ({
    name,
    comments: count  // Changed from commands
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
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
          <Bar dataKey="comments" fill="#f59e0b" /> {/* Changed from commands */}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}