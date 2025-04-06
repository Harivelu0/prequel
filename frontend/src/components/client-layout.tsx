'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    
    setIsClient(true);

    // Check if user has completed onboarding
    const hasCompletedOnboarding = 
      typeof window !== 'undefined' && 
      localStorage.getItem('onboardingCompleted') === 'true';
    
    setShowSidebar(hasCompletedOnboarding);

    // Handle setup completion event
    const handleSetupCompleted = () => {
      localStorage.setItem('onboardingCompleted', 'true');
      setShowSidebar(true);
      router.push('/');
    };

    // Add event listener for setup completion
    window.addEventListener('setup-completed', handleSetupCompleted);

    // Cleanup event listener
    return () => {
      window.removeEventListener('setup-completed', handleSetupCompleted);
    };
  }, [router]);

  // Prevent rendering on server
  if (!isClient) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {showSidebar && <Sidebar />}
      <main className={`overflow-auto ${showSidebar ? 'flex-1 p-4' : 'w-full'}`}>
        {children}
      </main>
    </div>
  );
}