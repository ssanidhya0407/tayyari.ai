'use client';

import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import PointsDisplay from '@/app/components/PointsDisplay';
import Navbar from '@/components/custom/navbar';

export default function UniversalHeader() {
  const { user } = useUser();
  const pathname = usePathname();
  
  // Define pages where we don't want to show the header
  const hideHeaderPaths = ['/', '/sign-in', '/sign-up'];
  const shouldShowHeader = !hideHeaderPaths.includes(pathname);
  
  if (!shouldShowHeader) {
    return null;
  }

  return (
    <>
      {/* Navbar first */}
      <nav className="relative z-40">
        <Navbar />
      </nav>
      
      {/* Points Display after navbar, only for authenticated users */}
      {user && (
        <div className="fixed top-16 left-0 right-0 z-[90] bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900 border-b border-gray-700/50 py-2">
          <div className="container mx-auto px-4 py-3">
            <PointsDisplay />
          </div>
        </div>
      )}
    </>
  );
}
