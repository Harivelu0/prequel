'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/sidebar';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSidebar, setShowSidebar] = useState(false);
  
  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted') === 'true';
    setShowSidebar(hasCompletedOnboarding);
  }, []);

  return (
    <div className="flex h-screen bg-gray-900">
      {showSidebar && <Sidebar />}
      <main className={`overflow-auto ${showSidebar ? 'flex-1 p-4' : 'w-full'}`}>
        {children}
      </main>
    </div>
  );
}