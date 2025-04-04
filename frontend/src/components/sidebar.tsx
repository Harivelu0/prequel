'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartBarIcon,
  ClockIcon,
  CodeBracketIcon,
  UserGroupIcon,
  CogIcon,
  ShieldCheckIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

// Update your existing sidebar navItems array:
const navItems = [
  { name: 'Dashboard', href: '/', icon: ChartBarIcon },
  { name: 'Stale PRs', href: '/stale-prs', icon: ClockIcon },
  { name: 'Repositories', href: '/repositories', icon: CodeBracketIcon },
  { name: 'Contributors', href: '/contributors', icon: UserGroupIcon },
  { name: 'Branch Protection', href: '/branch-protection', icon: ShieldCheckIcon }, // Corrected to ShieldCheckIcon
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-800 shadow-md flex flex-col">
      {/* Logo and App Name */}
      <div className="px-6 py-6">
        <h1 className="text-2xl font-bold text-indigo-400">Prequel</h1>
        <p className="text-sm text-gray-400">GitHub Workflow Monitor</p>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 mt-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-6 py-3 text-sm font-medium rounded-md ${
                    isActive
                      ? 'text-indigo-400 bg-gray-700'
                      : 'text-gray-300 hover:text-indigo-400 hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-indigo-400' : 'text-gray-400'
                  }`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Footer with version */}
      <div className="px-6 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">Version 1.0.0</p>
      </div>
    </div>
  );
}