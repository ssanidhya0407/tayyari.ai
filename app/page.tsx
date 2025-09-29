'use client';

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "@/components/custom/navbar";
import RiveHero from "@/app/components/RiveHero"; // ← Fixed import path

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: { 
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1]
  }
};

const staggerContainer = {
  initial: {},
  animate: { 
    transition: { 
      staggerChildren: 0.3,
      delayChildren: 0.2,
    } 
  }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 }
};

export default function Home() {
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navbar */}
      <Navbar loggedIn={false} />

      {/* Interactive Rive Hero Section - REPLACES the old hero */}
      <section className="relative w-full overflow-hidden">
  <RiveHero />
</section>

      {/* Features grid */}
      <section className="container mx-auto px-8 md:px-12 lg:px-16 py-24 my-12">
  <motion.div
    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, margin: "-100px" }}
    variants={staggerContainer}
  >
    {/* Professional Card 1 */}
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 p-8 hover:border-purple-500/50 transition-all duration-500"
      variants={scaleIn}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Content */}
      <div className="relative z-10">
        <div className="mb-6 p-3 w-fit bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
          <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-300 transition-colors">
          Drop Any Content
        </h3>
        
        <p className="text-slate-400 text-base leading-relaxed mb-6">
          Transform lectures, research papers, and notes into interactive learning experiences with our AI-powered platform.
        </p>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
            Try Now
          </button>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </motion.div>

    {/* Professional Card 2 */}
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 p-8 hover:border-blue-500/50 transition-all duration-500"
      variants={scaleIn}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="mb-6 p-3 w-fit bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-blue-300 transition-colors">
          Learn Your Way
        </h3>
        
        <p className="text-slate-400 text-base leading-relaxed mb-6">
          AI adapts to your learning style, creating personalized paths that match how your brain processes information best.
        </p>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Explore
          </button>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors">
            Details
          </button>
        </div>
      </div>
    </motion.div>

    {/* Professional Card 3 */}
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700/50 p-8 hover:border-emerald-500/50 transition-all duration-500"
      variants={scaleIn}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        <div className="mb-6 p-3 w-fit bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-emerald-300 transition-colors">
          Make It Stick
        </h3>
        
        <p className="text-slate-400 text-base leading-relaxed mb-6">
          Reinforce learning with AI-generated quizzes, flashcards, and visual maps designed for long-term retention.
        </p>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
            Start Quiz
          </button>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors">
            View More
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
</section>

      {/* User journey breakdown */}
<section className="container mx-auto px-4 py-24">
  <motion.div
    className="max-w-4xl mx-auto"
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, margin: "-100px" }}
    variants={staggerContainer}
  >
    {/* Section Header */}
    <div className="text-center mb-16">
      <motion.h2 
        className="text-3xl md:text-4xl font-bold text-white mb-4"
        variants={fadeInUp}
      >
        How It Works
      </motion.h2>
      <motion.p 
        className="text-slate-400 text-lg max-w-2xl mx-auto"
        variants={fadeInUp}
      >
        Three simple steps to transform your learning experience with AI
      </motion.p>
    </div>

    {/* Steps */}
    <div className="space-y-12">
      {/* Step 1 */}
      <motion.div 
        className="flex items-start gap-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
        variants={fadeInUp}
      >
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
          1
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">Upload Your Content</h3>
          <p className="text-slate-400 leading-relaxed">
            Simply drag and drop your learning materials—PDFs, slides, notes, or videos. Our AI instantly processes and understands your content structure.
          </p>
        </div>
      </motion.div>

      {/* Step 2 */}
      <motion.div 
        className="flex items-start gap-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
        variants={fadeInUp}
      >
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
          2
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">AI Processing</h3>
          <p className="text-slate-400 leading-relaxed">
            Advanced AI algorithms analyze your content, extract key concepts, and create personalized learning paths tailored to your cognitive style.
          </p>
        </div>
      </motion.div>

      {/* Step 3 */}
      <motion.div 
        className="flex items-start gap-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
        variants={fadeInUp}
      >
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
          3
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">Interactive Learning</h3>
          <p className="text-slate-400 leading-relaxed">
            Engage with dynamic quizzes, interactive summaries, and adaptive content that evolves based on your progress and understanding.
          </p>
        </div>
      </motion.div>
    </div>
  </motion.div>
</section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-32">
        <motion.div
          className="relative p-16 rounded-[2.5rem] bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_80px_rgba(0,0,0,0.5)] transition-all duration-700 group"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1]
          }}
        >
          {/* Optional rotating gradient behind */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-20 rounded-[2.5rem] blur-xl animate-pulse z-0 pointer-events-none"></div>

          <div className="relative z-10 text-center">
            <motion.h2
              className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-purple-500 drop-shadow-md"
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.2,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1]
              }}
            >
              Ready to learn differently?
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.4,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1]
              }}
              className="mt-10"
            >
              <Link href="/learn">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-6 text-xl rounded-2xl font-semibold transition-all duration-300 shadow-md">
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

    </main>
  )
}
