'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { User, Bot, ImageIcon, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

import { Message } from './types';

// Enhanced message component with advanced interactive features
export default function EnhancedMessageWithVisuals({ message }: { message: Message }) {
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [likedMessage, setLikedMessage] = useState(false);

  const handleFeedback = (isPositive: boolean) => {
    if (!feedbackGiven) {
      setFeedbackGiven(true);
      setLikedMessage(isPositive);
      
      if (isPositive) {
        toast.success('Thanks for your feedback! +5 XP', {
          icon: '👍',
          position: 'top-center',
          duration: 2000,
        });
      } else {
        toast.error('Thanks for your feedback! We\'ll improve.', {
          icon: '👎',
          position: 'top-center',
          duration: 2000,
        });
      }
    }
  };

  // Import components dynamically
  const CodePlayground = dynamic(() => import('./CodePlayground'), { ssr: false });
  const InteractiveQuiz = dynamic(() => import('./InteractiveQuiz'), { ssr: false });
  const ThreeDModel = dynamic(() => import('./ThreeDModel'), { ssr: false });
  const LearningPath = dynamic(() => import('./LearningPath'), { ssr: false });
  
  return (
    <div className={`py-5 px-4 md:px-6 ${message.sender === 'ai' ? 'bg-[#1E1F23]' : 'bg-[#242526]'} animate-slide-in`}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${
            message.sender === 'user' ? 'bg-gray-700' : 'bg-blue-600'
          } ${message.sender === 'ai' ? 'animate-pulse' : ''}`}>
            {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
          </div>

          {/* Message Content */}
          <div className="flex-1 overflow-hidden">
            {message.sender === 'ai' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </div>
                
                {/* Interactive 3D Model */}
                {message.visualData?.type === '3d' && (
                  <ThreeDModel 
                    modelType={message.visualData.data.modelType || 'cube'} 
                    title={message.visualData.data.title}
                    description={message.visualData.data.description}
                  />
                )}
                
                {/* Interactive Code Playground */}
                {message.codeSnippet && (
                  <CodePlayground 
                    code={message.codeSnippet.code} 
                    language={message.codeSnippet.language}
                    editable={message.codeSnippet.editable}
                  />
                )}
                
                {/* Interactive Quiz */}
                {message.quiz && message.quiz.length > 0 && (
                  <InteractiveQuiz 
                    questions={message.quiz?.map(q => ({
                      ...q,
                      explanation: "This reinforces the concept we just discussed."
                    })) || []}
                  />
                )}
                
                {/* Related Prompt Image */}
                {message.imageUrl && (
                  <motion.div 
                    className="mt-4 border border-gray-700 rounded-md p-3 bg-[#202123] interactive-card"
                    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <ImageIcon className="text-blue-400" size={14} />
                      <span className="text-xs font-medium text-blue-300">Visual Reference</span>
                    </div>
                    <Image 
                      src={message.imageUrl}
                      alt={`Visual for ${message.topic || 'topic'}`}
                      className="w-full rounded-md"
                      width={500}
                      height={300}
                      priority={false}
                      onError={(e) => {
                        // Custom error handling
                        const target = e.target as HTMLImageElement;
                        if (target) target.style.display = 'none';
                      }}
                    />
                  </motion.div>
                )}
                
                {/* Learning Path */}
                {message.topic && (
                  <div className="mt-4">
                    <LearningPath 
                      topics={[
                        {
                          id: '1',
                          title: `${message.topic} Fundamentals`,
                          description: `Master the core concepts of ${message.topic} with interactive exercises and visual guides.`,
                          progress: 25,
                          status: 'in-progress',
                          badges: ['Quick Learner', 'Concept Master'],
                          subtopics: [
                            { id: '1-1', title: 'Introduction', progress: 100, status: 'completed', description: '' },
                            { id: '1-2', title: 'Core Concepts', progress: 40, status: 'in-progress', description: '' },
                            { id: '1-3', title: 'Advanced Topics', progress: 0, status: 'locked', description: '', xpRequired: 150 }
                          ]
                        },
                        {
                          id: '2',
                          title: `${message.topic} in Practice`,
                          description: 'Apply your knowledge with real-world examples and projects.',
                          progress: 0,
                          status: 'locked',
                          xpRequired: 200,
                          badges: ['Practical Master', 'Problem Solver']
                        }
                      ]}
                      currentXP={message.pointsEarned || 50}
                      onTopicSelect={(topicId: string) => {
                        toast.info(`Starting topic: ${topicId}`, { 
                          position: 'top-center',
                          duration: 2000
                        });
                      }}
                    />
                  </div>
                )}

                {/* Gamification Elements */}
                {message.pointsEarned && (
                  <motion.div 
                    className="mt-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/50 p-3 rounded-md glow-effect"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="text-yellow-500 animate-float" size={18} />
                        <span className="gradient-text font-medium text-sm">+{message.pointsEarned} XP</span>
                      </div>
                      <span className="text-xs text-blue-300">Learning Bonus</span>
                    </div>
                  </motion.div>
                )}

                {/* Achievement Badges */}
                {message.achievements && message.achievements.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-1">
                      {message.achievements.map((achievement: string, idx: number) => (
                        <motion.div 
                          key={idx} 
                          className="bg-[#202123] px-2 py-1 rounded border border-gray-700/50 hover:border-blue-500/50 cursor-pointer transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }}
                          whileHover={{ y: -3, transition: { duration: 0.2 } }}
                        >
                          <div className="flex items-center space-x-1">
                            <Trophy size={10} className="text-yellow-500" />
                            <span className="text-xs text-gray-300">{achievement}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Message Feedback */}
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackGiven}
                    className={`p-1.5 rounded-full ${
                      feedbackGiven && likedMessage
                        ? 'bg-green-600/20 text-green-500'
                        : 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill={feedbackGiven && likedMessage ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905c0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackGiven}
                    className={`p-1.5 rounded-full ${
                      feedbackGiven && !likedMessage
                        ? 'bg-red-600/20 text-red-500'
                        : 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill={feedbackGiven && !likedMessage ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904c0-.715.211-1.413.608-2.008L17 13V4m-7 10h2" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}