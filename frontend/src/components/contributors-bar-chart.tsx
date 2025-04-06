'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ContributorsBarChartProps {
  data: [string, number][];
}

export default function ContributorsBarChart({ data }: ContributorsBarChartProps) {
  // Transform data for Recharts
  const chartData = data.map(([name, count]) => ({
    name,
    pullRequests: count
  }));

  // Define dark theme colors
  const textColor = '#e5e7eb';
  const gridColor = '#4b5563';
  const barColor = '#8b5cf6';

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="name" tick={{ fill: textColor }} />
          <YAxis tick={{ fill: textColor }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937',
              borderColor: '#4b5563',
              color: textColor
            }}
          />
          <Bar dataKey="pullRequests" fill={barColor} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}