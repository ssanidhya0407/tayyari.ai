import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    domains: ['images.unsplash.com', 'source.unsplash.com'],
  },
  
  // Experimental features
  experimental: {
    // Optimize for production
    optimizePackageImports: ['@clerk/nextjs', 'framer-motion'],
  },
  
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };
    return config;
  },
  
  // Add output file tracing root to avoid lockfile warnings
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;