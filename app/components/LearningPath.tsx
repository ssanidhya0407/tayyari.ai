'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Award, CheckCircle, Book, BarChart, ChevronRight, Plus, Lock } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  description: string;
  progress: number; // 0-100
  status: 'locked' | 'in-progress' | 'completed';
  xpRequired?: number;
  subtopics?: Topic[];
  badges?: string[];
}

interface LearningPathProps {
  topics: Topic[];
  currentXP: number;
  onTopicSelect: (topicId: string) => void;
}

export default function LearningPath({ topics, currentXP, onTopicSelect }: LearningPathProps) {
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  const toggleExpand = (topicId: string) => {
    setExpandedTopics(prev => ({
      ...prev,
      [topicId]: !prev[topicId]
    }));
  };
  
  return (
    <div className="my-6 rounded-lg border border-gray-700 overflow-hidden bg-[#202123]">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-lg font-medium">Your Learning Journey</h3>
          <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
            <Zap size={16} className="text-yellow-300 mr-1" />
            <span className="text-white font-medium">{currentXP} XP</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {topics.map((topic, index) => (
          <div key={topic.id} className="mb-4 last:mb-0">
            <div 
              className={`border ${
                topic.status === 'completed' ? 'border-green-500' : 
                topic.status === 'in-progress' ? 'border-blue-500' : 'border-gray-600'
              } rounded-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer`}
            >
              {/* Topic header */}
              <div 
                className={`p-3 flex items-center justify-between ${
                  topic.status === 'completed' ? 'bg-green-500/10' : 
                  topic.status === 'in-progress' ? 'bg-blue-500/10' : 'bg-gray-700/30'
                }`}
                onClick={() => topic.status !== 'locked' && toggleExpand(topic.id)}
              >
                <div className="flex items-center">
                  {topic.status === 'completed' ? (
                    <CheckCircle size={18} className="text-green-500 mr-2" />
                  ) : topic.status === 'in-progress' ? (
                    <Book size={18} className="text-blue-500 mr-2" />
                  ) : (
                    <Lock size={18} className="text-gray-500 mr-2" />
                  )}
                  <span className={`font-medium ${topic.status === 'locked' ? 'text-gray-500' : 'text-white'}`}>
                    {topic.title}
                  </span>
                </div>
                
                <div className="flex items-center">
                  {topic.status !== 'locked' && (
                    <div className="text-xs mr-3">
                      {topic.progress}% complete
                    </div>
                  )}
                  {topic.status === 'locked' && topic.xpRequired && (
                    <div className="text-xs mr-3 text-gray-400">
                      Requires {topic.xpRequired} XP
                    </div>
                  )}
                  <ChevronRight 
                    size={16} 
                    className={`transition-transform ${
                      expandedTopics[topic.id] ? 'rotate-90' : ''
                    } ${topic.status === 'locked' ? 'text-gray-500' : 'text-gray-300'}`}
                  />
                </div>
              </div>
              
              {/* Progress bar */}
              {topic.status !== 'locked' && (
                <div className="w-full h-1 bg-gray-700">
                  <motion.div 
                    className={`h-full ${
                      topic.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
              
              {/* Expanded content */}
              {topic.status !== 'locked' && expandedTopics[topic.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#1A1B21] p-4 border-t border-gray-700"
                >
                  <p className="text-gray-300 text-sm mb-4">{topic.description}</p>
                  
                  {/* Badges */}
                  {topic.badges && topic.badges.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 mb-2">Badges you can earn:</div>
                      <div className="flex flex-wrap gap-2">
                        {topic.badges.map((badge, idx) => (
                          <div key={idx} className="flex items-center bg-[#232429] px-2 py-1 rounded-full border border-gray-700">
                            <Award size={12} className="text-yellow-500 mr-1" />
                            <span className="text-xs text-gray-300">{badge}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Subtopics */}
                  {topic.subtopics && topic.subtopics.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Subtopics:</div>
                      <div className="space-y-2">
                        {topic.subtopics.map((subtopic, idx) => (
                          <div 
                            key={idx}
                            className={`flex items-center justify-between p-2 rounded border ${
                              subtopic.status === 'completed' ? 'border-green-500/50 bg-green-500/5' : 
                              subtopic.status === 'in-progress' ? 'border-blue-500/50 bg-blue-500/5' : 
                              'border-gray-700 bg-gray-700/20'
                            } hover:bg-gray-700/30 cursor-pointer transition-colors`}
                            onClick={() => subtopic.status !== 'locked' && onTopicSelect(subtopic.id)}
                          >
                            <div className="flex items-center">
                              {subtopic.status === 'completed' ? (
                                <CheckCircle size={14} className="text-green-500 mr-2" />
                              ) : subtopic.status === 'in-progress' ? (
                                <Book size={14} className="text-blue-500 mr-2" />
                              ) : (
                                <Lock size={14} className="text-gray-500 mr-2" />
                              )}
                              <span className={`text-sm ${subtopic.status === 'locked' ? 'text-gray-500' : 'text-gray-200'}`}>
                                {subtopic.title}
                              </span>
                            </div>
                            
                            {subtopic.status !== 'locked' && (
                              <div className="text-xs">
                                {subtopic.progress}%
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  {topic.status !== 'completed' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => onTopicSelect(topic.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md flex items-center transition-colors"
                      >
                        {topic.status === 'in-progress' ? (
                          <>Continue Learning<ChevronRight size={14} className="ml-1" /></>
                        ) : (
                          <>Start Learning<Plus size={14} className="ml-1" /></>
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary stats */}
      <div className="p-4 border-t border-gray-700 bg-[#1A1B21]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 mb-1">Progress overview</div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <CheckCircle size={14} className="text-green-500 mr-1" />
                <span className="text-sm text-gray-200">
                  {topics.filter(t => t.status === 'completed').length} completed
                </span>
              </div>
              <div className="flex items-center">
                <Book size={14} className="text-blue-500 mr-1" />
                <span className="text-sm text-gray-200">
                  {topics.filter(t => t.status === 'in-progress').length} in progress
                </span>
              </div>
              <div className="flex items-center">
                <Lock size={14} className="text-gray-500 mr-1" />
                <span className="text-sm text-gray-200">
                  {topics.filter(t => t.status === 'locked').length} locked
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <BarChart size={14} className="text-blue-400 mr-1" />
            <span className="text-sm text-gray-200">
              {Math.round(topics.reduce((acc, t) => acc + t.progress, 0) / topics.length)}% total progress
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}