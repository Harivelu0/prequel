'use client';

import React from 'react';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CodeBracketIcon, 
  UserGroupIcon, 
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

type IconType = 'chart' | 'clock' | 'pull-request' | 'user';

interface DashboardCardProps {
  title: string;
  value: number;
  icon: IconType;
  trend?: number;
  trendDirection?: 'up' | 'down';
}

const iconMap = {
  'chart': ChartBarIcon,
  'clock': ClockIcon,
  'pull-request': CodeBracketIcon,
  'user': UserGroupIcon,
};

export default function DashboardCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendDirection = 'up'
}: DashboardCardProps) {
  const Icon = iconMap[icon];
  
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="bg-indigo-900 p-3 rounded-full">
          <Icon className="h-6 w-6 text-indigo-400" />
        </div>
        <div className="ml-4">
          <h2 className="text-sm font-medium text-gray-400">{title}</h2>
          <p className="text-2xl font-semibold text-gray-100">{value}</p>
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center">
          {trendDirection === 'up' ? (
            <ArrowUpIcon className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownIcon className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm ml-1 ${
            trendDirection === 'up' ? 'text-green-500' : 'text-red-500'
          }`}>
            {trend}% from last week
          </span>
        </div>
      )}
    </div>
  );
}