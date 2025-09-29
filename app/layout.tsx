import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { Suspense } from 'react'; // Add this import

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Add this for better performance
  preload: true
});

export const metadata: Metadata = {
  title: 'Tayyari — Agentic AI Learning',
  description: 'Transform your learning materials into interactive, AI-powered learning experiences.',
};

// Loading component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.className}>
        <body className={inter.className}>
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
          <Toaster position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
