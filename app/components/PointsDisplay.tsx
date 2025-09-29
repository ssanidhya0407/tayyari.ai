'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';

interface UserStats {
  total_points: number;
  level: number;
  current_rank: number;
  badges_earned: number;
  username: string;
}

interface FloatingPoints {
  id: string;
  points: number;
  message: string;
}

export default function PointsDisplay() {
  const { user } = useUser();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoints[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/user/${user.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  }, [user]);

  const initializeAndFetchUser = useCallback(async () => {
    if (!user) return;
    
    try {
      // Initialize user in gamification system
      await fetch('http://localhost:5000/api/user/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          username: user.firstName || user.username || 'Student',
          email: user.primaryEmailAddress?.emailAddress || 'student@example.com'
        })
      });

      // Fetch user stats
      await fetchUserStats();
    } catch (error) {
      console.error('Error initializing user:', error);
    } finally {
      setLoading(false);
    }
  }, [user, fetchUserStats]);

  useEffect(() => {
    if (user?.id) {
      initializeAndFetchUser();
    }
  }, [user, initializeAndFetchUser]);



  const showFloatingPoints = useCallback((points: number, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFloatingPoint: FloatingPoints = { id, points, message };
    
    setFloatingPoints(prev => [...prev, newFloatingPoint]);
    
    // Remove after animation and refresh stats
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(fp => fp.id !== id));
      fetchUserStats(); // Refresh stats after points awarded
    }, 3000);
  }, [fetchUserStats]);

  // Expose function globally for quiz component to use
  useEffect(() => {
    (window as any).showFloatingPoints = showFloatingPoints;
  }, [showFloatingPoints]);

  if (loading) {
    return (
      <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg animate-pulse">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        <div className="w-24 h-4 bg-gray-300 rounded"></div>
        <div className="w-16 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (!userStats) return null;

  const pointsToNextLevel = (userStats.level * 100) - userStats.total_points;
  const progressPercent = Math.max(0, ((userStats.total_points % 100) / 100) * 100);

  return (
  <div className="relative z-10">
    {/* Main Points Display */}
    <motion.div 
      className="flex items-center space-x-4 md:space-x-6 p-3 md:p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-lg border border-white/10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Points & Level */}
      <div className="flex items-center space-x-2 md:space-x-3">
        <div className="text-lg md:text-2xl">💎</div>
        <div>
          <div className="text-sm md:text-lg font-bold text-white">
            {userStats.total_points.toLocaleString()} pts
          </div>
          <div className="text-xs md:text-sm text-gray-300">Level {userStats.level}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 max-w-32 md:max-w-48">
        <div className="flex justify-between text-xs text-gray-300 mb-1">
          <span>Level {userStats.level}</span>
          <span className="hidden md:inline">{pointsToNextLevel} to next</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <motion.div 
            className="h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Rank & Badges */}
      <div className="text-right">
        <div className="text-sm font-semibold text-yellow-400">
          #{userStats.current_rank}
        </div>
        <div className="text-xs text-gray-300">
          🏆 {userStats.badges_earned}
        </div>
      </div>

      {/* Username - Hidden on mobile */}
      <div className="hidden md:block text-sm text-gray-300">
        👋 {userStats.username}
      </div>
    </motion.div>

    {/* Floating Points Animation */}
    <AnimatePresence>
      {floatingPoints.map((fp) => (
        <motion.div
          key={fp.id}
          className="absolute top-0 left-1/2 pointer-events-none z-[100]"
          initial={{ opacity: 1, y: 0, x: -50 }}
          animate={{ opacity: 0, y: -100, x: -50 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3, ease: "easeOut" }}
        >
          <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            +{fp.points} pts 🎉
          </div>
          <div className="text-xs text-center text-green-400 mt-1 font-semibold">
            {fp.message}
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);
}