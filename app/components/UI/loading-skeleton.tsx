'use client';

export function FeatureCardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-8 rounded-3xl bg-gray-800/30 backdrop-blur-sm border border-gray-700/30">
      <div className="h-16 w-16 bg-gray-700 rounded-2xl"></div>
      <div className="h-6 bg-gray-700 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function StepSkeleton() {
  return (
    <div className="animate-pulse flex gap-8 items-start">
      <div className="h-12 w-12 bg-gray-700 rounded-2xl"></div>
      <div className="flex-1 space-y-2">
        <div className="h-6 bg-gray-700 rounded w-1/2"></div>
        <div className="h-4 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}
