'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';


export default function RocketLaunchButton() {
  const { user } = useUser();
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const handleClick = () => {
    if (!user) {
      // For non-signed-in users, this won't be called as SignInButton handles the click
      return;
    }

    // Start countdown sequence for signed-in users
    setShowCountdown(true);
    setCountdown(3);
  };

  // Countdown effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      // Launch!
      setIsLaunching(true);
      setShowCountdown(false);
      
      // Navigate after epic animation
      setTimeout(() => {
        router.push('/learn');
        setIsLaunching(false);
      }, 2500);
    }
  }, [showCountdown, countdown, router]);

  // Render SignInButton if user is not signed in
  if (!user) {
    return (
      <SignInButton mode="modal">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all text-white px-10 py-5 text-lg md:text-xl rounded-xl shadow-lg hover:shadow-purple-500/25 group overflow-hidden relative">
            <div className="flex items-center space-x-3">
              {/* Animated Rocket for Sign-In */}
              <motion.div
                className="text-2xl"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1],
                  y: [0, -2, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                🚀
              </motion.div>
              <span className="font-bold">Sign In to Launch!</span>
              
              {/* Sparkle Effects */}
              <motion.div
                className="absolute top-2 right-2 text-yellow-400"
                animate={{
                  scale: [0, 1, 0],
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.5
                }}
              >
                ✨
              </motion.div>
            </div>

            {/* Glow Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl"
              animate={{
                opacity: [0.2, 0.8, 0.2]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </Button>
        </motion.div>
      </SignInButton>
    );
  }

  // Epic Rocket Launch for signed-in users
  return (
    <div className="relative">
      {/* Main Launch Button */}
      <motion.div
        animate={isLaunching ? { 
          scale: [1, 1.1, 1.05],
          rotateZ: [0, -2, 2, 0]
        } : {}}
        transition={{ duration: 0.3, repeat: isLaunching ? 5 : 0 }}
      >
        <Button 
          onClick={handleClick}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:scale-105 transition-all text-white px-10 py-5 text-lg md:text-xl rounded-xl shadow-lg hover:shadow-purple-500/25 group overflow-hidden relative"
          disabled={isLaunching || showCountdown}
        >
          <div className="flex items-center space-x-3 relative z-10">
            {/* Epic Rocket with Multiple Animations */}
            <motion.div
              className="relative text-2xl"
              initial={{ rotate: 0, scale: 1 }}
              animate={
                isLaunching ? {
                  y: [-5, -50, -150, -300, -500],
                  x: [0, 10, -5, 15, 0],
                  rotate: [0, -15, 25, -10, 360],
                  scale: [1, 1.2, 1.5, 0.8, 0],
                  opacity: [1, 1, 1, 0.5, 0]
                } : showCountdown ? {
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0],
                  y: [0, -5, 0]
                } : {}
              }
              transition={{ 
                duration: isLaunching ? 2.5 : 0.8,
                ease: isLaunching ? "easeOut" : "easeInOut",
                times: isLaunching ? [0, 0.2, 0.5, 0.8, 1] : [0, 0.5, 1]
              }}
            >
              🚀
              
              {/* Rocket Exhaust */}
              <AnimatePresence>
                {(isLaunching || showCountdown) && (
                  <motion.div
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1, 1.5, 2],
                      opacity: [0, 1, 0.8, 0],
                      height: [0, 10, 20, 30]
                    }}
                    transition={{ 
                      duration: 0.6,
                      repeat: Infinity,
                      ease: "easeOut"
                    }}
                  >
                    <div className="w-3 bg-gradient-to-b from-blue-400 via-orange-500 to-red-600 rounded-full"></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Dynamic Button Text */}
            <motion.span 
              className="font-bold"
              animate={isLaunching ? { 
                color: ['#ffffff', '#ffd700', '#ff6b35', '#ffffff']
              } : {}}
              transition={{ duration: 0.5, repeat: isLaunching ? Infinity : 0 }}
            >
              {isLaunching ? 'LAUNCHING! 🔥' : 
               showCountdown ? `READY... ${countdown}` :
               'Start Now'}
            </motion.span>
          </div>

          {/* Epic Background Effects */}
          <AnimatePresence>
            {isLaunching && (
              <>
                {/* Explosion Background */}
                <motion.div
                  className="absolute inset-0 bg-gradient-radial from-orange-400 via-red-500 to-purple-600 opacity-80"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 2, 4, 6],
                    opacity: [0, 0.8, 0.4, 0]
                  }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
                
                {/* Fire Waves */}
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`wave-${i}`}
                    className="absolute inset-0 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent rounded-xl"
                    initial={{ height: 0, bottom: 0, opacity: 0 }}
                    animate={{ 
                      height: ['0%', '100%', '100%'],
                      opacity: [0, 0.7, 0]
                    }}
                    transition={{ 
                      duration: 1.5,
                      delay: i * 0.3,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Countdown Display */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 text-6xl font-black text-yellow-400"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1],
              opacity: [0, 1, 1],
              rotateY: [0, 360]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: "backOut" }}
            key={countdown}
          >
            {countdown || "🚀"}
            
            {/* Countdown Ring */}
            <motion.div
              className="absolute inset-0 border-4 border-yellow-400 rounded-full"
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particle Explosion System */}
      <AnimatePresence>
        {isLaunching && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Star Particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-2 h-2 bg-yellow-400"
                style={{
                  left: '50%',
                  top: '50%',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  x: (Math.random() - 0.5) * 400,
                  y: (Math.random() - 0.5) * 400,
                  rotate: Math.random() * 720
                }}
                transition={{ 
                  duration: 2,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
              />
            ))}
            
            {/* Smoke Clouds */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`smoke-${i}`}
                className="absolute w-8 h-8 bg-gray-400 rounded-full opacity-30"
                style={{
                  left: '50%',
                  top: '100%'
                }}
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  scale: [0, 2, 4],
                  opacity: [0, 0.6, 0],
                  x: (Math.random() - 0.5) * 200,
                  y: -100 - Math.random() * 100
                }}
                transition={{ 
                  duration: 3,
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
              />
            ))}

            {/* Lightning Bolts */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`bolt-${i}`}
                className="absolute w-1 bg-gradient-to-b from-yellow-300 to-orange-500"
                style={{
                  left: `${40 + i * 5}%`,
                  top: '30%',
                  height: '60px',
                  transformOrigin: 'top'
                }}
                initial={{ 
                  scaleY: 0, 
                  opacity: 0,
                  skewX: 0
                }}
                animate={{ 
                  scaleY: [0, 1, 0],
                  opacity: [0, 1, 0],
                  skewX: [0, 20, -20, 0]
                }}
                transition={{ 
                  duration: 0.3,
                  delay: 1 + i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Success Message with Epic Animation */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-400 to-blue-500 text-white px-6 py-2 rounded-full text-lg font-bold shadow-lg"
            initial={{ 
              opacity: 0, 
              scale: 0,
              y: 50,
              rotateX: -90
            }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              scale: [0, 1.2, 1, 1.2],
              y: [50, 0, -10, -50],
              rotateX: [-90, 0, 0, 90]
            }}
            transition={{ 
              duration: 2.5,
              times: [0, 0.3, 0.7, 1],
              ease: "easeOut"
            }}
          >
            🚀 BLAST OFF!! ✨
            
            {/* Sparkle Ring */}
            <motion.div
              className="absolute inset-0 border-2 border-yellow-400 rounded-full"
              animate={{ 
                scale: [1, 1.5, 2],
                opacity: [1, 0.5, 0],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Shake Effect */}
      {isLaunching && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-[9999]"
          animate={{
            x: [0, -2, 2, -1, 1, 0],
            y: [0, -1, 1, -2, 2, 0]
          }}
          transition={{
            duration: 0.5,
            repeat: 3,
            ease: "easeInOut"
          }}
        />
      )}
    </div>
  );
}
